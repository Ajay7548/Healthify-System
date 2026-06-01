import { connectToDatabase, disconnectFromDatabase, syncIndexes } from '../db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../utils/password.js';
import { buildMetrics } from '../utils/metric-catalog.js';
import { reportDedupeKey } from '../utils/dedupe.js';
import { User } from '../models/user.model.js';
import { HealthReport } from '../models/health-report.model.js';

// A small, hand-crafted demo dataset so the app has something to show out of the
// box. The company's full dataset is loaded separately through the admin upload
// (Uploads -> Upload data). One shared password for every demo patient, printed
// at the end so a reviewer can log in immediately.
const PATIENT_PASSWORD = 'Patient123!';
const SEED_SOURCE = 'seed-clinic';

// The demo patient gets six months of history so the dashboard charts and trend
// lines have real data to draw.
const DEMO_PATIENTS = [
  {
    email: 'jane.doe@healthcare.test',
    fullName: 'Jane Doe',
    dateOfBirth: '1985-04-12',
    mrn: 'MRN-1001',
    city: 'Pune',
    state: 'Maharashtra',
    age: 41,
    gender: 'Female',
    occupation: 'Teacher',
    healthCondition: 'Healthy',
    beautyGoal: 'Fitness',
    baseline: {
      hemoglobin: 13.6,
      vitamin_d: 55,
      cholesterol: 185,
      blood_sugar_fasting: 92,
      creatinine: 0.9,
      bmi: 22.5,
      urine: 'Negative',
    },
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

// Per-metric month-to-month wobble + the decimal precision a real lab reports at.
const METRIC_VARIATION = {
  hemoglobin: { amplitude: 0.6, decimals: 1 },
  vitamin_d: { amplitude: 8, decimals: 0 },
  cholesterol: { amplitude: 12, decimals: 0 },
  blood_sugar_fasting: { amplitude: 8, decimals: 0 },
  creatinine: { amplitude: 0.12, decimals: 2 },
  bmi: { amplitude: 0.8, decimals: 1 },
};

// Deterministic month-to-month variation so re-seeding always produces the same
// numbers (stable charts, reproducible demos) without random noise.
function vary(base, monthIndex, amplitude, decimals) {
  const factor = 10 ** decimals;
  return Math.round((base + amplitude * Math.sin(monthIndex * 1.3)) * factor) / factor;
}

function buildRow(baseline, monthIndex) {
  const row = { urine_protein: baseline.urine };
  for (const [column, { amplitude, decimals }] of Object.entries(METRIC_VARIATION)) {
    row[column] = vary(baseline[column], monthIndex, amplitude, decimals);
  }
  return row;
}

function buildReport(userId, email, dateStr, monthIndex, baseline) {
  const row = buildRow(baseline, monthIndex);
  return {
    userId,
    reportDate: new Date(dateStr),
    source: SEED_SOURCE,
    summary: `Routine check-up on ${dateStr}`,
    metrics: buildMetrics(row),
    // Key `raw` by dataset column name so seeded reports share the same raw shape
    // as uploaded ones.
    raw: { email, report_date: dateStr, source: SEED_SOURCE, ...row },
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
    isActive: true,
  });
  if (!adminBefore) usersCreated += 1;

  // 2. Demo patient with six months of history.
  for (const patient of DEMO_PATIENTS) {
    const before = await User.countDocuments({ email: patient.email });
    const user = await ensureUser({
      email: patient.email,
      passwordHash: await hashPassword(PATIENT_PASSWORD),
      fullName: patient.fullName,
      role: 'USER',
      mrn: patient.mrn,
      dateOfBirth: new Date(patient.dateOfBirth),
      city: patient.city,
      state: patient.state,
      age: patient.age,
      gender: patient.gender,
      occupation: patient.occupation,
      healthCondition: patient.healthCondition,
      beautyGoal: patient.beautyGoal,
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
  console.log('');

  await disconnectFromDatabase();
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Seed failed');
    process.exit(1);
  });
