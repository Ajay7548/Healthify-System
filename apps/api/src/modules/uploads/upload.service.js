import { parse } from 'csv-parse/sync';
import { csvReportRowSchema, CSV_REQUIRED_HEADERS } from '@hc/shared';
import { NotFoundError } from '../../common/errors.js';
import { METRIC_CATALOG, flagFor } from '../../common/metric-catalog.js';
import { reportDedupeKey } from '../../common/dedupe.js';
import { getSkip, buildPaginationMeta } from '../../common/pagination.js';
import { User } from '../users/user.model.js';
import { HealthReport } from '../reports/health-report.model.js';
import { UploadBatch } from './upload-batch.model.js';

// Bounded so a single upload can't try to ingest an unreasonable number of rows.
const MAX_ROWS = 10_000;
// Cap how many per-row errors we persist so one catastrophic file can't bloat a doc.
const MAX_STORED_ERRORS = 200;

function toBatchDto(doc) {
  return {
    id: String(doc._id),
    filename: doc.filename,
    status: doc.status,
    totalRows: doc.totalRows,
    insertedRows: doc.insertedRows,
    skippedRows: doc.skippedRows,
    failedRows: doc.failedRows,
    errors: (doc.rowErrors ?? []).map((e) => ({
      row: e.row,
      column: e.column ?? undefined,
      message: e.message,
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
    finishedAt: doc.finishedAt ? new Date(doc.finishedAt).toISOString() : null,
  };
}

function buildReportDoc(row, userId, batchId) {
  const metrics = METRIC_CATALOG.map((def) => {
    const value = row[def.column];
    return {
      code: def.code,
      label: def.label,
      value,
      unit: def.unit,
      refLow: def.refLow,
      refHigh: def.refHigh,
      flag: flagFor(value, def.refLow, def.refHigh),
    };
  });
  return {
    userId,
    reportDate: new Date(row.report_date),
    source: row.source,
    summary: null,
    metrics,
    raw: row,
    uploadBatchId: batchId,
    dedupeKey: reportDedupeKey(row.email, row.report_date, row.source),
  };
}

async function finalize(
  batch,
  { status, errors = [], totalRows = 0, insertedRows = 0, skippedRows = 0 },
) {
  batch.status = status;
  batch.totalRows = totalRows;
  batch.insertedRows = insertedRows;
  batch.skippedRows = skippedRows;
  batch.failedRows = errors.length;
  batch.rowErrors = errors.slice(0, MAX_STORED_ERRORS);
  batch.finishedAt = new Date();
  await batch.save();
  return toBatchDto(batch);
}

// Which (userId, dedupeKey) pairs already exist — grouped by user so each lookup
// rides the unique { userId, dedupeKey } index instead of scanning.
async function findExistingKeys(docs) {
  const keysByUser = new Map();
  for (const doc of docs) {
    const userId = String(doc.userId);
    if (!keysByUser.has(userId)) keysByUser.set(userId, []);
    keysByUser.get(userId).push(doc.dedupeKey);
  }

  const existing = new Set();
  for (const [userId, keys] of keysByUser) {
    const found = await HealthReport.find(
      { userId, dedupeKey: { $in: keys } },
      { dedupeKey: 1 },
    ).lean();
    for (const row of found) existing.add(`${userId}:${row.dedupeKey}`);
  }
  return existing;
}

/**
 * Ingest a CSV buffer into health reports. Always records an audit batch, never
 * aborts the whole file for one bad row (partial success), and is idempotent —
 * re-importing the same file skips rows that already exist.
 */
export async function ingestCsv({ buffer, filename, uploadedById }) {
  const batch = await UploadBatch.create({ filename, uploadedById, status: 'PROCESSING' });

  let records;
  try {
    records = parse(buffer, { columns: true, trim: true, skip_empty_lines: true, bom: true });
  } catch (error) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [{ row: 1, message: `Could not parse CSV: ${error.message}` }],
    });
  }

  if (records.length === 0) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [{ row: 1, message: 'The file has no data rows' }],
    });
  }
  const missing = CSV_REQUIRED_HEADERS.filter((header) => !(header in records[0]));
  if (missing.length) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [{ row: 1, message: `Missing required column(s): ${missing.join(', ')}` }],
    });
  }
  if (records.length > MAX_ROWS) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [{ row: 1, message: `Too many rows (${records.length}); the limit is ${MAX_ROWS}` }],
    });
  }

  const errors = [];
  const validRows = [];
  records.forEach((record, index) => {
    const rowNumber = index + 2; // header occupies line 1
    const parsed = csvReportRowSchema.safeParse(record);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row: rowNumber,
          column: issue.path.join('.') || undefined,
          message: issue.message,
        });
      }
      return;
    }
    validRows.push({ rowNumber, data: parsed.data });
  });

  // Resolve every referenced email to a user in one query.
  const emails = [...new Set(validRows.map((r) => r.data.email))];
  const users = await User.find({ email: { $in: emails } }, { email: 1 }).lean();
  const userIdByEmail = new Map(users.map((u) => [u.email, String(u._id)]));

  const seenKeys = new Set();
  const docs = [];
  let skippedRows = 0;
  for (const { rowNumber, data } of validRows) {
    const userId = userIdByEmail.get(data.email);
    if (!userId) {
      errors.push({
        row: rowNumber,
        column: 'email',
        message: `No patient with email ${data.email}`,
      });
      continue;
    }
    const dedupeKey = reportDedupeKey(data.email, data.report_date, data.source);
    if (seenKeys.has(dedupeKey)) {
      skippedRows += 1; // duplicate row within the same file
      continue;
    }
    seenKeys.add(dedupeKey);
    docs.push(buildReportDoc(data, userId, batch._id));
  }

  // Drop rows that already exist (idempotent re-import).
  const existing = await findExistingKeys(docs);
  const toInsert = docs.filter((doc) => {
    const isExisting = existing.has(`${String(doc.userId)}:${doc.dedupeKey}`);
    if (isExisting) skippedRows += 1;
    return !isExisting;
  });

  let insertedRows = 0;
  if (toInsert.length) {
    try {
      const result = await HealthReport.insertMany(toInsert, { ordered: false });
      insertedRows = result.length;
    } catch (error) {
      // A concurrent import could race us to the same key; treat residual
      // duplicate-key write errors as skips, count the rest as inserted.
      insertedRows = error.insertedDocs?.length ?? 0;
      const writeErrors = error.writeErrors ?? [];
      skippedRows += writeErrors.filter((w) => (w.err?.code ?? w.code) === 11000).length;
    }
  }

  let status;
  if (errors.length === 0) status = 'COMPLETED';
  else if (insertedRows > 0 || skippedRows > 0) status = 'PARTIAL';
  else status = 'FAILED';

  return finalize(batch, {
    status,
    errors,
    totalRows: records.length,
    insertedRows,
    skippedRows,
  });
}

export async function listBatches(query) {
  const [docs, total] = await Promise.all([
    UploadBatch.find().sort({ createdAt: -1 }).skip(getSkip(query)).limit(query.pageSize).lean(),
    UploadBatch.countDocuments(),
  ]);
  return { items: docs.map(toBatchDto), pagination: buildPaginationMeta(query, total) };
}

export async function getBatch(batchId) {
  const doc = await UploadBatch.findById(batchId).lean();
  if (!doc) throw new NotFoundError('Upload batch not found');
  return toBatchDto(doc);
}
