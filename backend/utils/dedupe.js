import { createHash } from 'node:crypto';

// Stable identity for a report: the same patient, date and source always produce
// the same key. Combined with a unique index on (userId, dedupeKey) this makes
// re-importing a CSV idempotent — duplicates are detected, not duplicated. Date
// is normalized to YYYY-MM-DD so the seed and CSV paths agree.
export function reportDedupeKey(email, reportDate, source) {
  const normalizedDate = reportDate.slice(0, 10);
  return createHash('sha256')
    .update(`${email.trim().toLowerCase()}|${normalizedDate}|${source.trim().toLowerCase()}`)
    .digest('hex');
}
