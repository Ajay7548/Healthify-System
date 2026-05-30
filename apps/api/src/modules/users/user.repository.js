import { User } from './user.model.js';
import { HealthReport } from '../reports/health-report.model.js';

// Escape user input before it becomes a RegExp, so a stray "(" or ".*" can't
// break the query or turn into an expensive pattern.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchUsers({ search, role, isActive, sortBy, sortDir, skip, limit }) {
  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ fullName: pattern }, { email: pattern }];
  }
  if (role) filter.role = role;
  if (typeof isActive === 'boolean') filter.isActive = isActive;

  const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { users, total };
}

// One aggregation gets the most recent report date for every user on the page,
// instead of N per-user queries.
export async function lastReportDatesFor(userIds) {
  if (userIds.length === 0) return new Map();
  const rows = await HealthReport.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', last: { $max: '$reportDate' } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.last]));
}

export function findUserById(userId) {
  return User.findById(userId).lean();
}
