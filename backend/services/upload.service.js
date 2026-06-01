import {
  clientRowSchema,
  healthReportRowSchema,
  HEALTH_REPORT_REQUIRED_HEADERS,
} from '../validation/index.js';
import { NotFoundError } from '../utils/errors.js';
import { buildMetrics } from '../utils/metric-catalog.js';
import { reportDedupeKey } from '../utils/dedupe.js';
import { getSkip, buildPaginationMeta } from '../utils/pagination.js';
import { User } from '../models/user.model.js';
import { HealthReport } from '../models/health-report.model.js';
import { UploadBatch } from '../models/upload-batch.model.js';
import { parseUpload } from './workbook-parser.js';

// Bounded so a single upload can't try to ingest an unreasonable number of rows.
// The company file has ~5k clients / ~25k reports; these leave generous headroom.
const MAX_REPORT_ROWS = 50_000;
const MAX_CLIENT_ROWS = 20_000;
// Cap how many per-row errors we persist so one catastrophic file can't bloat a doc.
const MAX_STORED_ERRORS = 200;
// Insert reports in chunks so a 25k-row file is never one giant write.
const INSERT_CHUNK = 2_000;

function toBatchDto(doc) {
  return {
    id: String(doc._id),
    filename: doc.filename,
    status: doc.status,
    clientsCreated: doc.clientsCreated ?? 0,
    clientsUpdated: doc.clientsUpdated ?? 0,
    totalRows: doc.totalRows,
    insertedRows: doc.insertedRows,
    skippedRows: doc.skippedRows,
    failedRows: doc.failedRows,
    errors: (doc.rowErrors ?? []).map((e) => ({
      sheet: e.sheet ?? undefined,
      row: e.row,
      column: e.column ?? undefined,
      message: e.message,
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
    finishedAt: doc.finishedAt ? new Date(doc.finishedAt).toISOString() : null,
  };
}

function buildReportDoc(data, userId, source, batchId) {
  // Prefer the dataset's own report_id as the idempotency key (globally unique and
  // stable); fall back to a patient+date+source hash for CSVs that omit it.
  const dedupeKey = data.report_id
    ? `rpt:${data.report_id}`
    : reportDedupeKey(data.email ?? `client:${data.client_id}`, data.report_date, source);
  return {
    userId,
    reportDate: new Date(data.report_date),
    source,
    summary: data.doctor_notes ?? null,
    metrics: buildMetrics(data),
    raw: data,
    externalId: data.report_id ?? null,
    externalClientId: data.client_id ?? null,
    uploadBatchId: batchId,
    dedupeKey,
  };
}

async function finalize(
  batch,
  {
    status,
    errors = [],
    clientsCreated = 0,
    clientsUpdated = 0,
    totalRows = 0,
    insertedRows = 0,
    skippedRows = 0,
    failedRows,
  },
) {
  batch.status = status;
  batch.clientsCreated = clientsCreated;
  batch.clientsUpdated = clientsUpdated;
  batch.totalRows = totalRows;
  batch.insertedRows = insertedRows;
  batch.skippedRows = skippedRows;
  // failedRows counts distinct failed report *rows*; a row with two bad cells
  // yields two error entries but is still one failed row. Falls back to
  // errors.length for the file-level failures (parse error, missing columns).
  batch.failedRows = failedRows ?? errors.length;
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

// Phase 1 — upsert every client from the `clients` sheet by its stable clientId,
// so a re-import updates demographics in place rather than duplicating people.
async function upsertClients(rows, errors) {
  const failedRows = new Set();
  const ops = [];
  const now = new Date();
  for (const { row, data } of rows) {
    const parsed = clientRowSchema.safeParse(data);
    if (!parsed.success) {
      failedRows.add(row);
      for (const issue of parsed.error.issues) {
        errors.push({
          sheet: 'clients',
          row,
          column: issue.path.join('.') || undefined,
          message: issue.message,
        });
      }
      continue;
    }
    const c = parsed.data;
    ops.push({
      updateOne: {
        filter: { clientId: c.client_id },
        update: {
          $set: {
            email: c.email,
            fullName: c.full_name,
            mobile: c.mobile ?? null,
            city: c.city ?? null,
            state: c.state ?? null,
            age: c.age ?? null,
            gender: c.gender ?? null,
            occupation: c.occupation ?? null,
            healthCondition: c.health_condition ?? null,
            beautyGoal: c.beauty_goal ?? null,
            updatedAt: now,
          },
          $setOnInsert: {
            clientId: c.client_id,
            role: 'USER',
            isActive: true,
            // Preserve the dataset's signup date as "member since".
            createdAt: c.created_at ? new Date(c.created_at) : now,
          },
        },
        upsert: true,
      },
    });
  }

  let created = 0;
  let updated = 0;
  if (ops.length) {
    try {
      // timestamps:false — we set createdAt/updatedAt ourselves to keep the real
      // signup date (Mongoose would otherwise stamp createdAt at import time).
      const res = await User.bulkWrite(ops, { ordered: false, timestamps: false });
      created = res.upsertedCount ?? 0;
      updated = res.matchedCount ?? 0;
    } catch (error) {
      created = error.result?.upsertedCount ?? 0;
      updated = error.result?.matchedCount ?? 0;
      for (const we of error.writeErrors ?? []) {
        errors.push({ sheet: 'clients', row: 0, message: we.errmsg ?? 'Failed to upsert client' });
      }
    }
  }
  return { created, updated, failedRows };
}

/**
 * Ingest an uploaded dataset (CSV or two-sheet xlsx) into clients + health
 * reports. Always records an audit batch, never aborts the whole file for one
 * bad row (partial success), and is idempotent — re-importing the same file
 * upserts clients and skips reports that already exist.
 */
export async function ingestUpload({ buffer, filename, uploadedById }) {
  const batch = await UploadBatch.create({ filename, uploadedById, status: 'PROCESSING' });

  let parsed;
  try {
    parsed = await parseUpload(buffer, filename);
  } catch (error) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [{ row: 1, message: `Could not read the file: ${error.message}` }],
    });
  }

  const reportHeaders = new Set(parsed.reports.headers);
  const missing = HEALTH_REPORT_REQUIRED_HEADERS.filter((header) => !reportHeaders.has(header));
  if (missing.length) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [
        { sheet: 'health_reports', row: 1, message: `Missing required column(s): ${missing.join(', ')}` },
      ],
    });
  }
  if (parsed.reports.rows.length === 0) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [{ sheet: 'health_reports', row: 1, message: 'The file has no report rows' }],
    });
  }
  if (parsed.reports.rows.length > MAX_REPORT_ROWS) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [
        {
          sheet: 'health_reports',
          row: 1,
          message: `Too many report rows (${parsed.reports.rows.length}); the limit is ${MAX_REPORT_ROWS}`,
        },
      ],
    });
  }
  if (parsed.clients && parsed.clients.rows.length > MAX_CLIENT_ROWS) {
    return finalize(batch, {
      status: 'FAILED',
      errors: [
        {
          sheet: 'clients',
          row: 1,
          message: `Too many client rows (${parsed.clients.rows.length}); the limit is ${MAX_CLIENT_ROWS}`,
        },
      ],
    });
  }

  const errors = [];

  // Phase 1: clients (xlsx only).
  let clientsCreated = 0;
  let clientsUpdated = 0;
  let clientFailures = 0;
  if (parsed.clients) {
    const result = await upsertClients(parsed.clients.rows, errors);
    clientsCreated = result.created;
    clientsUpdated = result.updated;
    clientFailures = result.failedRows.size;
  }

  // Phase 2: validate report rows.
  const failedRowNumbers = new Set();
  const validRows = [];
  for (const { row, data } of parsed.reports.rows) {
    const result = healthReportRowSchema.safeParse(data);
    if (!result.success) {
      failedRowNumbers.add(row);
      for (const issue of result.error.issues) {
        errors.push({
          sheet: 'health_reports',
          row,
          column: issue.path.join('.') || undefined,
          message: issue.message,
        });
      }
      continue;
    }
    validRows.push({ row, data: result.data });
  }

  // Resolve every client link (by clientId, or email for a bare CSV) in two queries.
  const clientIds = [...new Set(validRows.map((r) => r.data.client_id).filter((v) => v != null))];
  const emails = [...new Set(validRows.map((r) => r.data.email).filter(Boolean))];
  const [byClientId, byEmail] = await Promise.all([
    clientIds.length ? User.find({ clientId: { $in: clientIds } }, { clientId: 1 }).lean() : [],
    emails.length ? User.find({ email: { $in: emails } }, { email: 1 }).lean() : [],
  ]);
  const userIdByClientId = new Map(byClientId.map((u) => [u.clientId, String(u._id)]));
  const userIdByEmail = new Map(byEmail.map((u) => [u.email, String(u._id)]));

  const source = parsed.format === 'xlsx' ? 'xlsx-upload' : 'csv-upload';
  const seenKeys = new Set();
  const docs = [];
  let skippedRows = 0;
  for (const { row, data } of validRows) {
    const userId =
      (data.client_id != null && userIdByClientId.get(data.client_id)) ||
      (data.email && userIdByEmail.get(data.email));
    if (!userId) {
      failedRowNumbers.add(row);
      const ref = data.client_id != null ? `client_id ${data.client_id}` : `email ${data.email}`;
      errors.push({ sheet: 'health_reports', row, column: 'client_id', message: `No client found for ${ref}` });
      continue;
    }
    const doc = buildReportDoc(data, userId, source, batch._id);
    const key = `${userId}:${doc.dedupeKey}`;
    if (seenKeys.has(key)) {
      skippedRows += 1; // duplicate row within the same file
      continue;
    }
    seenKeys.add(key);
    docs.push(doc);
  }

  // Drop rows that already exist (idempotent re-import).
  const existing = await findExistingKeys(docs);
  const toInsert = docs.filter((doc) => {
    const isExisting = existing.has(`${String(doc.userId)}:${doc.dedupeKey}`);
    if (isExisting) skippedRows += 1;
    return !isExisting;
  });

  let insertedRows = 0;
  let writeFailures = 0;
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    try {
      const result = await HealthReport.insertMany(chunk, { ordered: false });
      insertedRows += result.length;
    } catch (error) {
      // ordered:false keeps inserting past failures. A concurrent import could
      // race us to the same key (duplicate-key) — those count as skips. Anything
      // else is a genuine write failure and must land in the totals, not vanish.
      insertedRows += error.insertedDocs?.length ?? 0;
      for (const writeError of error.writeErrors ?? []) {
        if ((writeError.err?.code ?? writeError.code) === 11000) {
          skippedRows += 1;
        } else {
          writeFailures += 1;
          errors.push({ sheet: 'health_reports', row: 0, message: writeError.errmsg ?? 'Failed to write row' });
        }
      }
    }
  }

  const failedRows = failedRowNumbers.size + writeFailures;
  const anyFailure = failedRows > 0 || clientFailures > 0;
  const anySuccess =
    insertedRows > 0 || skippedRows > 0 || clientsCreated > 0 || clientsUpdated > 0;

  let status;
  if (!anyFailure) status = 'COMPLETED';
  else if (anySuccess) status = 'PARTIAL';
  else status = 'FAILED';

  return finalize(batch, {
    status,
    errors,
    clientsCreated,
    clientsUpdated,
    failedRows,
    totalRows: parsed.reports.rows.length,
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
