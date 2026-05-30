import { connectToDatabase, disconnectFromDatabase, syncIndexes } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../common/password.js';
import { METRIC_CATALOG, flagFor } from '../common/metric-catalog.js';
import { reportDedupeKey } from '../common/dedupe.js';
import { User } from '../modules/users/user.model.js';
import { HealthReport } from '../modules/reports/health-report.model.js';

// One shared password for every demo patient — printed at the end so a reviewer
// can log in immediately. Real accounts would never share a password.
const PATIENT_PASSWORD = 'Patient123!';
const SEED_SOURCE = 'seed-clinic';

// Three "featured" patients get six months of history so the dashboard charts
// have a real trend to draw. John sits in borderline-high territory on purpose
// so the HIGH flags and reference ranges are visible in the UI.
const FEATURED_PATIENTS = [
  {
    email: 'jane.doe@healthcare.test',
    fullName: 'Jane Doe',
    dateOfBirth: '1985-04-12',
    mrn: 'MRN-1001',
    baseline: { hr: 72, systolic: 118, diastolic: 78, glucose: 92, cholesterol: 185 },
  },
  {
    email: 'john.smith@healthcare.test',
    fullName: 'John Smith',
    dateOfBirth: '1978-09-30',
    mrn: 'MRN-1002',
    baseline: { hr: 84, systolic: 134, diastolic: 86, glucose: 110, cholesterol: 215 },
  },
  {
    email: 'maria.garcia@healthcare.test',
    fullName: 'Maria Garcia',
    dateOfBirth: '1992-01-22',
    mrn: 'MRN-1003',
    baseline: { hr: 65, systolic: 110, diastolic: 70, glucose: 85, cholesterol: 170 },
  },
];

const REPORT_MONTHS = [
  '2025-11-15',
  '2025-12-15',
  '2026-01-15',
  '2026-02-15',
  '2026-03-15',
  '2026-04-15',
];

const METRIC_AMPLITUDE = { hr: 5, systolic: 6, diastolic: 4, glucose: 6, cholesterol: 10 };

// Deterministic month-to-month variation so re-seeding always produces the same
// numbers (stable charts, reproducible demos) without random noise.
function vary(base, monthIndex, amplitude) {
  return Math.round(base + amplitude * Math.sin(monthIndex * 1.3));
}

function buildMetrics(baseline, monthIndex) {
  return METRIC_CATALOG.map((def) => {
    const value = vary(baseline[def.column] ?? 0, monthIndex, METRIC_AMPLITUDE[def.column] ?? 0);
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
}

function buildReport(userId, email, dateStr, monthIndex, baseline) {
  const metrics = buildMetrics(baseline, monthIndex);
  const raw = { email, report_date: dateStr, source: SEED_SOURCE };
  for (const metric of metrics) raw[metric.code.toLowerCase()] = metric.value;

  return {
    userId,
    reportDate: new Date(dateStr),
    source: SEED_SOURCE,
    summary: `Routine check-up on ${dateStr}`,
    metrics,
    raw,
    uploadBatchId: null,
    dedupeKey: reportDedupeKey(email, dateStr, SEED_SOURCE),
  };
}

async function ensureUser(data) {
  const existing = await User.findOne({ email: data.email });
  if (existing) return existing;
  return User.create(data);
}

// Upsert a report by its natural key. Returns true if a new report was inserted.
async function ensureReport(report) {
  const { userId, dedupeKey, ...rest } = report;
  const result = await HealthReport.updateOne(
    { userId, dedupeKey },
    { $setOnInsert: rest },
    { upsert: true },
  );
  return Boolean(result.upsertedCount);
}

// A pool of filler patients so the admin list paginates and search has something
// to find. One recent report each — enough to show a "last report" date.
const FILLER_FIRST_NAMES = [
  'Liam',
  'Olivia',
  'Noah',
  'Emma',
  'Oliver',
  'Ava',
  'Elijah',
  'Sophia',
  'James',
  'Isabella',
  'William',
  'Mia',
  'Henry',
  'Amelia',
  'Lucas',
  'Harper',
  'Benjamin',
  'Evelyn',
  'Theodore',
  'Abigail',
  'Jack',
  'Ella',
  'Leo',
  'Scarlett',
  'Daniel',
  'Grace',
  'Owen',
];
const FILLER_LAST_NAMES = [
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Miller',
  'Davis',
  'Wilson',
  'Anderson',
  'Taylor',
  'Thomas',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Walker',
  'Hall',
  'Allen',
  'Young',
  'King',
  'Wright',
  'Scott',
  'Green',
  'Baker',
  'Adams',
  'Nelson',
  'Hill',
  'Campbell',
];

async function seed() {
  await connectToDatabase();
  await syncIndexes();

  let usersCreated = 0;
  let reportsCreated = 0;

  // 1. Admin.
  const adminBefore = await User.countDocuments({ email: env.SEED_ADMIN_EMAIL });
  await ensureUser({
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
    fullName: 'Platform Admin',
    role: 'ADMIN',
    mrn: null,
    dateOfBirth: null,
    isActive: true,
  });
  if (!adminBefore) usersCreated += 1;

  // 2. Featured patients with six months of history.
  for (const patient of FEATURED_PATIENTS) {
    const before = await User.countDocuments({ email: patient.email });
    const user = await ensureUser({
      email: patient.email,
      passwordHash: await hashPassword(PATIENT_PASSWORD),
      fullName: patient.fullName,
      role: 'USER',
      mrn: patient.mrn,
      dateOfBirth: new Date(patient.dateOfBirth),
      isActive: true,
    });
    if (!before) usersCreated += 1;

    for (const [monthIndex, dateStr] of REPORT_MONTHS.entries()) {
      const inserted = await ensureReport(
        buildReport(user._id, patient.email, dateStr, monthIndex, patient.baseline),
      );
      if (inserted) reportsCreated += 1;
    }
  }

  // 3. Filler patients for pagination/search, one recent report each.
  for (let i = 0; i < FILLER_FIRST_NAMES.length; i += 1) {
    const first = FILLER_FIRST_NAMES[i] ?? 'Patient';
    const last = FILLER_LAST_NAMES[i] ?? `No${i}`;
    const email = `${first}.${last}@healthcare.test`.toLowerCase();
    const before = await User.countDocuments({ email });
    const user = await ensureUser({
      email,
      passwordHash: await hashPassword(PATIENT_PASSWORD),
      fullName: `${first} ${last}`,
      role: 'USER',
      mrn: `MRN-${2000 + i}`,
      dateOfBirth: new Date(1980 + (i % 25), i % 12, 1 + (i % 27)),
      isActive: i % 9 !== 0, // a few inactive accounts to exercise the filter
    });
    if (!before) usersCreated += 1;

    const baseline = {
      hr: 70 + (i % 15),
      systolic: 112 + (i % 20),
      diastolic: 72 + (i % 12),
      glucose: 88 + (i % 18),
      cholesterol: 175 + (i % 40),
    };
    const inserted = await ensureReport(buildReport(user._id, email, '2026-04-20', i, baseline));
    if (inserted) reportsCreated += 1;
  }

  const totalUsers = await User.countDocuments();
  const totalReports = await HealthReport.countDocuments();
  logger.info(
    { usersCreated, reportsCreated, totalUsers, totalReports },
    'Seed complete (idempotent — existing records were left untouched)',
  );

  // Plain console so the credentials are visible regardless of log level.
  console.log('\nDemo credentials');
  console.log('  Admin   ', env.SEED_ADMIN_EMAIL, '/', env.SEED_ADMIN_PASSWORD);
  console.log('  Patient ', 'jane.doe@healthcare.test', '/', PATIENT_PASSWORD);
  console.log(
    '  Patient ',
    'john.smith@healthcare.test',
    '/',
    PATIENT_PASSWORD,
    '(borderline-high readings)',
  );
  console.log('');

  await disconnectFromDatabase();
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Seed failed');
    process.exit(1);
  });
