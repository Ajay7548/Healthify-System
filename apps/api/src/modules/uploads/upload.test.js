import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, teardownTestDb, clearCollections } from '../../test/db.js';
import { User } from '../users/user.model.js';
import { HealthReport } from '../reports/health-report.model.js';
import { hashPassword } from '../../common/password.js';
import { ingestCsv } from './upload.service.js';

const HEADER = 'email,report_date,source,hr,systolic,diastolic,glucose,cholesterol';
let adminId;
let patientEmail;

beforeAll(setupTestDb);
afterAll(teardownTestDb);
beforeEach(async () => {
  await clearCollections();
  patientEmail = 'patient@test.dev';
  const [admin] = await Promise.all([
    User.create({
      email: 'admin@test.dev',
      passwordHash: await hashPassword('Secret123!'),
      fullName: 'Admin',
      role: 'ADMIN',
      isActive: true,
    }),
    User.create({
      email: patientEmail,
      passwordHash: await hashPassword('Secret123!'),
      fullName: 'Patient',
      role: 'USER',
      isActive: true,
    }),
  ]);
  adminId = admin.id;
});

function csv(...rows) {
  return Buffer.from([HEADER, ...rows].join('\n'));
}

function ingest(buffer) {
  return ingestCsv({ buffer, filename: 'reports.csv', uploadedById: adminId });
}

describe('CSV ingestion', () => {
  it('inserts valid rows and computes metric flags', async () => {
    const batch = await ingest(csv(`${patientEmail},2026-01-01,lab,72,118,78,90,180`));
    expect(batch.status).toBe('COMPLETED');
    expect(batch.insertedRows).toBe(1);

    const report = await HealthReport.findOne({}).lean();
    expect(report.metrics).toHaveLength(5);
    expect(report.metrics.find((m) => m.code === 'HR').flag).toBe('NORMAL');
  });

  it('is idempotent — re-importing the same file skips everything', async () => {
    const file = csv(`${patientEmail},2026-01-01,lab,72,118,78,90,180`);
    await ingest(file);
    const second = await ingest(file);
    expect(second.insertedRows).toBe(0);
    expect(second.skippedRows).toBe(1);
    expect(await HealthReport.countDocuments()).toBe(1);
  });

  it('reports per-row errors and still imports the good rows (partial success)', async () => {
    const batch = await ingest(
      csv(
        `${patientEmail},2026-02-01,lab,72,118,78,90,180`, // valid
        `not-an-email,2026-02-01,lab,72,118,78,90,180`, // bad email
        `${patientEmail},01/02/2026,lab,72,118,78,90,180`, // bad date
        `ghost@test.dev,2026-02-01,lab,72,118,78,90,180`, // unknown patient
      ),
    );
    expect(batch.status).toBe('PARTIAL');
    expect(batch.insertedRows).toBe(1);
    expect(batch.failedRows).toBe(3);
    expect(batch.errors.map((e) => e.row)).toEqual([3, 4, 5]);
  });

  it('fails a file that is missing required columns', async () => {
    const batch = await ingest(Buffer.from('email,report_date\nx@test.dev,2026-01-01'));
    expect(batch.status).toBe('FAILED');
    expect(batch.errors[0].message).toMatch(/Missing required column/);
  });
});
