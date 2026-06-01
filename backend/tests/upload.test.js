import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { CLIENT_HEADERS, HEALTH_REPORT_HEADERS } from '../validation/index.js';
import { setupTestDb, teardownTestDb, clearCollections } from './db.js';
import { User } from '../models/user.model.js';
import { HealthReport } from '../models/health-report.model.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { ingestUpload } from '../services/upload.service.js';

let adminId;

beforeAll(setupTestDb);
afterAll(teardownTestDb);
beforeEach(async () => {
  await clearCollections();
  const admin = await User.create({
    email: 'admin@test.dev',
    passwordHash: await hashPassword('Secret123!'),
    fullName: 'Admin',
    role: 'ADMIN',
    isActive: true,
  });
  adminId = admin.id;
});

// A clean, in-range report row; spread over it to introduce abnormal/invalid cells.
const NORMAL = {
  hemoglobin: 14,
  vitamin_d: 50,
  cholesterol: 180,
  blood_sugar_fasting: 90,
  creatinine: 0.9,
  urine_protein: 'Negative',
  bmi: 22,
  doctor_notes: 'Normal findings',
};

const CLIENTS = [
  {
    client_id: 1,
    full_name: 'Alice A',
    email: 'alice@test.dev',
    city: 'Pune',
    state: 'Maharashtra',
    age: 30,
    gender: 'Female',
    occupation: 'Engineer',
    health_condition: 'Healthy',
    beauty_goal: 'Fitness',
    created_at: '2024-01-01',
  },
  {
    client_id: 2,
    full_name: 'Bob B',
    email: 'bob@test.dev',
    city: 'Kochi',
    state: 'Kerala',
    age: 45,
    gender: 'Male',
    occupation: 'Doctor',
    health_condition: 'Diabetes',
    beauty_goal: 'Weight Loss',
    created_at: '2023-06-01',
  },
];

async function buildXlsx({ clients, reports }) {
  const workbook = new ExcelJS.Workbook();
  if (clients) {
    const sheet = workbook.addWorksheet('clients');
    sheet.addRow(CLIENT_HEADERS);
    for (const c of clients) sheet.addRow(CLIENT_HEADERS.map((h) => c[h] ?? ''));
  }
  const reportsSheet = workbook.addWorksheet('health_reports');
  reportsSheet.addRow(HEALTH_REPORT_HEADERS);
  for (const r of reports) reportsSheet.addRow(HEALTH_REPORT_HEADERS.map((h) => r[h] ?? ''));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function ingest(buffer, filename = 'dataset.xlsx') {
  return ingestUpload({ buffer, filename, uploadedById: adminId });
}

describe('xlsx ingestion', () => {
  it('upserts clients and inserts their reports', async () => {
    const buffer = await buildXlsx({
      clients: CLIENTS,
      reports: [
        { report_id: 'RPT1', client_id: 1, report_date: '2026-01-01', ...NORMAL },
        { report_id: 'RPT2', client_id: 2, report_date: '2026-01-02', ...NORMAL },
      ],
    });
    const batch = await ingest(buffer);

    expect(batch.status).toBe('COMPLETED');
    expect(batch.clientsCreated).toBe(2);
    expect(batch.insertedRows).toBe(2);
    expect(batch.failedRows).toBe(0);

    const alice = await User.findOne({ clientId: 1 }).lean();
    expect(alice.fullName).toBe('Alice A');
    expect(alice.state).toBe('Maharashtra');
    // Imported clients get the shared demo password so a reviewer can sign in.
    expect(await verifyPassword('Patient123!', alice.passwordHash)).toBe(true);
    expect(await HealthReport.countDocuments()).toBe(2);
  });

  it('sets the demo password on insert but never overwrites it on re-import', async () => {
    const buffer = await buildXlsx({
      clients: [CLIENTS[0]],
      reports: [{ report_id: 'RPT1', client_id: 1, report_date: '2026-01-01', ...NORMAL }],
    });
    await ingest(buffer);

    // The client later changes their password.
    await User.updateOne({ clientId: 1 }, { passwordHash: await hashPassword('Changed456!') });

    // A re-import updates demographics ($set) but must not reset the password
    // ($setOnInsert only applies to brand-new clients).
    await ingest(buffer);

    const alice = await User.findOne({ clientId: 1 }).lean();
    expect(await verifyPassword('Changed456!', alice.passwordHash)).toBe(true);
    expect(await verifyPassword('Patient123!', alice.passwordHash)).toBe(false);
  });

  it('computes numeric flags and stores the categorical urine result', async () => {
    const buffer = await buildXlsx({
      clients: [CLIENTS[0]],
      reports: [
        { report_id: 'RPT1', client_id: 1, report_date: '2026-01-01', ...NORMAL, bmi: 32, urine_protein: 'Positive' },
      ],
    });
    await ingest(buffer);

    const report = await HealthReport.findOne({ externalId: 'RPT1' }).lean();
    const bmi = report.metrics.find((m) => m.code === 'BMI');
    expect(bmi.flag).toBe('HIGH'); // 32 > 24.9
    const urine = report.metrics.find((m) => m.code === 'UPRO');
    expect(urine.kind).toBe('CATEGORICAL');
    expect(urine.value).toBeNull();
    expect(urine.valueText).toBe('Positive');
    expect(urine.flag).toBe('HIGH');
    expect(report.summary).toBe('Normal findings'); // doctor_notes -> summary
  });

  it('is idempotent — re-importing the same workbook inserts nothing new', async () => {
    const buffer = await buildXlsx({
      clients: CLIENTS,
      reports: [{ report_id: 'RPT1', client_id: 1, report_date: '2026-01-01', ...NORMAL }],
    });
    await ingest(buffer);
    const second = await ingest(buffer);

    expect(second.insertedRows).toBe(0);
    expect(second.skippedRows).toBe(1);
    expect(second.clientsUpdated).toBe(2);
    expect(await HealthReport.countDocuments()).toBe(1);
    expect(await User.countDocuments({ role: 'USER' })).toBe(2);
  });

  it('reports per-row errors and still imports the good rows (partial success)', async () => {
    const buffer = await buildXlsx({
      clients: CLIENTS,
      reports: [
        { report_id: 'RPT1', client_id: 1, report_date: '2026-01-01', ...NORMAL }, // valid
        { report_id: 'RPT2', client_id: 2, report_date: '2026-01-02', ...NORMAL, urine_protein: 'Maybe' }, // bad enum
        { report_id: 'RPT3', client_id: 999, report_date: '2026-01-03', ...NORMAL }, // unknown client
      ],
    });
    const batch = await ingest(buffer);

    expect(batch.status).toBe('PARTIAL');
    expect(batch.insertedRows).toBe(1);
    expect(batch.failedRows).toBe(2);
    expect(batch.errors.every((e) => e.sheet === 'health_reports')).toBe(true);
  });

  it('fails a workbook whose health_reports sheet is missing a metric column', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('health_reports');
    sheet.addRow(['client_id', 'report_date', 'hemoglobin']); // missing most metrics
    sheet.addRow([1, '2026-01-01', 14]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const batch = await ingest(buffer);
    expect(batch.status).toBe('FAILED');
    expect(batch.errors[0].message).toMatch(/Missing required column/);
  });
});

describe('CSV ingestion (reports for existing clients)', () => {
  it('ingests a health-report CSV keyed by email', async () => {
    await User.create({ clientId: 7, email: 'carol@test.dev', fullName: 'Carol', role: 'USER', isActive: true });
    const csv = Buffer.from(
      'email,report_date,hemoglobin,vitamin_d,cholesterol,blood_sugar_fasting,creatinine,urine_protein,bmi,doctor_notes\n' +
        'carol@test.dev,2026-03-01,14,50,180,90,0.9,Negative,22,Routine\n',
    );
    const batch = await ingestUpload({ buffer: csv, filename: 'reports.csv', uploadedById: adminId });

    expect(batch.status).toBe('COMPLETED');
    expect(batch.clientsCreated).toBe(0); // CSV has no clients sheet
    expect(batch.insertedRows).toBe(1);
    const report = await HealthReport.findOne({}).lean();
    expect(report.source).toBe('csv-upload');
  });

  it('fails a CSV missing required columns', async () => {
    const csv = Buffer.from('email,report_date\ncarol@test.dev,2026-03-01\n');
    const batch = await ingestUpload({ buffer: csv, filename: 'reports.csv', uploadedById: adminId });
    expect(batch.status).toBe('FAILED');
    expect(batch.errors[0].message).toMatch(/Missing required column/);
  });
});
