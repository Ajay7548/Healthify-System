import { HealthReport } from '../models/health-report.model.js';

// All queries are scoped by userId and lean (plain objects, no Mongoose document
// overhead) since these are read paths. They lean on the
// { userId: 1, reportDate: -1 } index for both the sort and the range filter.

export function findLatestForUser(userId) {
  return HealthReport.findOne({ userId }).sort({ reportDate: -1 }).lean();
}

function buildDateFilter(userId, from, to) {
  const filter = { userId };
  if (from || to) {
    filter.reportDate = {};
    if (from) filter.reportDate.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.reportDate.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  return filter;
}

export function findReportsPage(userId, { skip, limit, from, to }) {
  const filter = buildDateFilter(userId, from, to);
  return Promise.all([
    HealthReport.find(filter).sort({ reportDate: -1 }).skip(skip).limit(limit).lean(),
    HealthReport.countDocuments(filter),
  ]);
}

// Ownership is enforced in the query itself: a user can never read another
// user's report by guessing its id.
export function findReportByIdForUser(userId, reportId) {
  return HealthReport.findOne({ _id: reportId, userId }).lean();
}

export function countForUser(userId) {
  return HealthReport.countDocuments({ userId });
}
