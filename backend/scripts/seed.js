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

// Three "featured" patients get six months of history so the dashboard charts
// have a real trend to draw. John sits in borderline-high territory on purpose
// so HIGH/LOW flags and reference ranges are visible in the UI.
const FEATURED_PATIENTS = [
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
  {
    email: 'john.smith@healthcare.test',
    fullName: 'John Smith',
    dateOfBirth: '1978-09-30',
    mrn: 'MRN-1002',
    city: 'Mumbai',
    state: 'Maharashtra',
    age: 47,
    gender: 'Male',
    occupation: 'Manager',
    healthCondition: 'High Cholesterol',
    beautyGoal: 'Weight Loss',
    baseline: {
      hemoglobin: 14.2,
      vitamin_d: 24, // < 30 -> LOW
      cholesterol: 224, // > 200 -> HIGH
      blood_sugar_fasting: 116, // > 99 -> HIGH
      creatinine: 1.15,
      bmi: 29.4, // > 24.9 -> HIGH
      urine: 'Trace', // -> HIGH
    },
  },
  {
    email: 'maria.garcia@healthcare.test',
    fullName: 'Maria Garcia',
    dateOfBirth: '1992-01-22',
    mrn: 'MRN-1003',
    city: 'Bengaluru',
    state: 'Karnataka',
    age: 34,
    gender: 'Female',
    occupation: 'Engineer',
    healthCondition: 'Healthy',
    beautyGoal: 'Skin Glow',
    baseline: {
      hemoglobin: 13.1,
      vitamin_d: 62,
      cholesterol: 172,
      blood_sugar_fasting: 86,
      creatinine: 0.8,
      bmi: 21.3,
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

// A pool of filler patients so the admin list paginates and the filters/insights
// have spread. One recent report each — enough to show a "last report" date.
const FILLER_FIRST_NAMES = [
  'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Elijah', 'Sophia', 'James',
  'Isabella', 'William', 'Mia', 'Henry', 'Amelia', 'Lucas', 'Harper', 'Benjamin',
  'Evelyn', 'Theodore', 'Abigail', 'Jack', 'Ella', 'Leo', 'Scarlett', 'Daniel',
  'Grace', 'Owen',
];
const FILLER_LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson',
  'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Walker', 'Hall', 'Allen',
  'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill',
  'Campbell',
];
const CITIES = ['Pune', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Ahmedabad', 'Kochi', 'Indore'];
const STATES = ['Maharashtra', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Telangana', 'Gujarat', 'Kerala', 'Madhya Pradesh'];
const CONDITIONS = ['Healthy', 'Diabetes', 'Hypertension', 'Obesity', 'Thyroid', 'PCOS', 'Anemia', 'High Cholesterol', 'Vitamin D Deficiency'];
const GOALS = ['Fitness', 'Weight Loss', 'Skin Glow', 'Hair Care', 'Anti Aging', 'Stress Management', 'Acne Treatment'];
const OCCUPATIONS = ['Engineer', 'Teacher', 'Doctor', 'Manager', 'Business', 'Student'];
const URINE_CYCLE = ['Negative', 'Negative', 'Trace', 'Positive'];

function fillerBaseline(i) {
  return {
    hemoglobin: 12.4 + (i % 5) * 0.8,
    vitamin_d: 26 + (i % 6) * 9,
    cholesterol: 168 + (i % 8) * 9,
    blood_sugar_fasting: 84 + (i % 7) * 8,
    creatinine: 0.7 + (i % 5) * 0.13,
    bmi: 20 + (i % 9) * 1.5,
    urine: URINE_CYCLE[i % URINE_CYCLE.length],
  };
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
      city: CITIES[i % CITIES.length],
      state: STATES[i % STATES.length],
      age: 25 + ((i * 2) % 45),
      gender: i % 2 === 0 ? 'Female' : 'Male',
      occupation: OCCUPATIONS[i % OCCUPATIONS.length],
      healthCondition: CONDITIONS[i % CONDITIONS.length],
      beautyGoal: GOALS[i % GOALS.length],
      isActive: i % 9 !== 0, // a few inactive accounts to exercise the filter
    });
    if (!before) usersCreated += 1;

    const inserted = await ensureReport(
      buildReport(user._id, email, '2026-04-20', i, fillerBaseline(i)),
    );
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
