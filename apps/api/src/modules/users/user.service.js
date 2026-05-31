import { getSkip, buildPaginationMeta } from '../../common/pagination.js';
import { NotFoundError } from '../../common/errors.js';
import * as repo from './user.repository.js';
import * as reportRepo from '../reports/report.repository.js';
import { toReportDto } from '../reports/report.serializer.js';

function toListItem(user, lastReportDate) {
  return {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: new Date(user.createdAt).toISOString(),
    lastReportDate: lastReportDate ? new Date(lastReportDate).toISOString() : null,
    // Demographics shown in the list (and reused by the detail view).
    age: user.age ?? null,
    gender: user.gender ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    healthCondition: user.healthCondition ?? null,
  };
}

export async function searchUsers(query) {
  const { users, total } = await repo.searchUsers({
    ...query,
    skip: getSkip(query),
    limit: query.pageSize,
  });
  const lastByUser = await repo.lastReportDatesFor(users.map((u) => u._id));
  const items = users.map((user) => toListItem(user, lastByUser.get(String(user._id))));
  return { items, pagination: buildPaginationMeta(query, total) };
}

export function getFacets() {
  return repo.getFacets();
}

export async function getUserDetail(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError('User not found');

  const [reportCount, latest] = await Promise.all([
    reportRepo.countForUser(userId),
    reportRepo.findLatestForUser(userId),
  ]);

  return {
    ...toListItem(user, latest?.reportDate),
    clientId: user.clientId ?? null,
    mobile: user.mobile ?? null,
    occupation: user.occupation ?? null,
    beautyGoal: user.beautyGoal ?? null,
    mrn: user.mrn ?? null,
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : null,
    reportCount,
  };
}

export async function getUserReports(userId, query) {
  // Confirm the user exists so the client gets a clean 404 rather than an empty
  // page that's indistinguishable from "no reports".
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError('User not found');

  const [docs, total] = await reportRepo.findReportsPage(userId, {
    skip: getSkip(query),
    limit: query.pageSize,
    from: query.from,
    to: query.to,
  });
  return { items: docs.map(toReportDto), pagination: buildPaginationMeta(query, total) };
}
