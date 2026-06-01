import { getSkip, buildPaginationMeta } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';
import * as repo from './report.repository.js';
import { toReportDto } from './report.serializer.js';

export async function getLatestReport(userId) {
  const doc = await repo.findLatestForUser(userId);
  return doc ? toReportDto(doc) : null;
}

export async function getReportHistory(userId, query) {
  const [docs, total] = await repo.findReportsPage(userId, {
    skip: getSkip(query),
    limit: query.pageSize,
    from: query.from,
    to: query.to,
  });
  return { items: docs.map(toReportDto), pagination: buildPaginationMeta(query, total) };
}

export async function getReportById(userId, reportId) {
  const doc = await repo.findReportByIdForUser(userId, reportId);
  if (!doc) throw new NotFoundError('Report not found');
  return toReportDto(doc);
}
