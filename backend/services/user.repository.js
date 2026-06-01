import { User } from '../models/user.model.js';
import { HealthReport } from '../models/health-report.model.js';

// Escape user input before it becomes a RegExp, so a stray "(" or ".*" can't
// break the query or turn into an expensive pattern.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchUsers({
  search,
  role,
  isActive,
  healthCondition,
  state,
  gender,
  beautyGoal,
  occupation,
  ageMin,
  ageMax,
  sortBy,
  sortDir,
  skip,
  limit,
}) {
  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ fullName: pattern }, { email: pattern }];
  }
  if (role) filter.role = role;
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  // Exact-match facets — each is backed by an index on the user model.
  if (healthCondition) filter.healthCondition = healthCondition;
  if (state) filter.state = state;
  if (gender) filter.gender = gender;
  if (beautyGoal) filter.beautyGoal = beautyGoal;
  if (occupation) filter.occupation = occupation;
  if (ageMin != null || ageMax != null) {
    filter.age = {};
    if (ageMin != null) filter.age.$gte = ageMin;
    if (ageMax != null) filter.age.$lte = ageMax;
  }

  const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { users, total };
}

// Distinct values that populate the filter dropdowns. Cheap at this scale and
// index-supported; nulls (seeded accounts without demographics) are dropped.
export async function getFacets() {
  const [healthConditions, states, genders, beautyGoals, occupations] = await Promise.all([
    User.distinct('healthCondition'),
    User.distinct('state'),
    User.distinct('gender'),
    User.distinct('beautyGoal'),
    User.distinct('occupation'),
  ]);
  const clean = (values) => values.filter(Boolean).sort();
  return {
    healthConditions: clean(healthConditions),
    states: clean(states),
    genders: clean(genders),
    beautyGoals: clean(beautyGoals),
    occupations: clean(occupations),
  };
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
