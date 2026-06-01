import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  authResultSchema,
  authUserSchema,
  healthReportSchema,
  paginationMetaSchema,
  adminUserListItemSchema,
  adminUserDetailSchema,
  uploadBatchSchema,
  insightsSchema,
  facetsSchema,
} from '../validation/index.js';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearCollections } from './db.js';
import { User } from '../models/user.model.js';
import { HealthReport } from '../models/health-report.model.js';
import { hashPassword } from '../utils/password.js';

// This is the test that makes "the client and server can't drift apart" true:
// it asserts the API's actual responses conform to the response schemas in
// validation/. If a DTO ever changes shape, this fails.
const app = createApp();
const patient = { email: 'pat@test.dev', password: 'Secret123!' };
const admin = { email: 'adm@test.dev', password: 'Secret123!' };

async function bearer(credentials) {
  const res = await request(app).post('/api/v1/auth/login').send(credentials);
  return `Bearer ${res.body.data.accessToken}`;
}

beforeAll(setupTestDb);
afterAll(teardownTestDb);
beforeEach(async () => {
  await clearCollections();
  const p = await User.create({
    email: patient.email,
    passwordHash: await hashPassword(patient.password),
    fullName: 'Pat Test',
    role: 'USER',
    isActive: true,
    mrn: 'MRN-9',
    dateOfBirth: new Date('1990-01-01'),
  });
  await User.create({
    email: admin.email,
    passwordHash: await hashPassword(admin.password),
    fullName: 'Adm Test',
    role: 'ADMIN',
    isActive: true,
  });
  await HealthReport.create({
    userId: p._id,
    reportDate: new Date('2026-01-01'),
    source: 'lab',
    summary: null,
    metrics: [
      {
        code: 'HGB',
        label: 'Hemoglobin',
        kind: 'NUMERIC',
        value: 14,
        valueText: null,
        unit: 'g/dL',
        refLow: 12,
        refHigh: 17,
        flag: 'NORMAL',
      },
    ],
    raw: {},
    uploadBatchId: null,
    dedupeKey: 'contract-key-1',
  });
});

describe('API responses conform to the validation contract', () => {
  it('auth: login + /me', async () => {
    const login = await request(app).post('/api/v1/auth/login').send(patient);
    expect(() => authResultSchema.parse(login.body.data)).not.toThrow();

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(() => authUserSchema.parse(me.body.data)).not.toThrow();
  });

  it('reports: latest + paginated history', async () => {
    const token = await bearer(patient);

    const latest = await request(app).get('/api/v1/me/reports/latest').set('Authorization', token);
    expect(() => healthReportSchema.parse(latest.body.data)).not.toThrow();

    const history = await request(app).get('/api/v1/me/reports').set('Authorization', token);
    history.body.data.forEach((report) =>
      expect(() => healthReportSchema.parse(report)).not.toThrow(),
    );
    expect(() => paginationMetaSchema.parse(history.body.meta.pagination)).not.toThrow();
  });

  it('admin: user list item + detail', async () => {
    const token = await bearer(admin);

    const list = await request(app).get('/api/v1/admin/users').set('Authorization', token);
    list.body.data.forEach((user) =>
      expect(() => adminUserListItemSchema.parse(user)).not.toThrow(),
    );

    const userId = list.body.data.find((u) => u.role === 'USER').id;
    const detail = await request(app)
      .get(`/api/v1/admin/users/${userId}`)
      .set('Authorization', token);
    expect(() => adminUserDetailSchema.parse(detail.body.data)).not.toThrow();
  });

  it('uploads: batch summary', async () => {
    const token = await bearer(admin);
    const csv = Buffer.from(
      'email,report_date,hemoglobin,vitamin_d,cholesterol,blood_sugar_fasting,creatinine,urine_protein,bmi,doctor_notes\n' +
        'pat@test.dev,2026-03-01,14,50,180,90,0.9,Negative,22,Routine\n',
    );
    const res = await request(app)
      .post('/api/v1/admin/reports/upload')
      .set('Authorization', token)
      .attach('file', csv, 'reports.csv');
    expect(() => uploadBatchSchema.parse(res.body.data)).not.toThrow();
  });

  it('admin: insights + facets', async () => {
    const token = await bearer(admin);

    const insights = await request(app).get('/api/v1/admin/insights').set('Authorization', token);
    expect(() => insightsSchema.parse(insights.body.data)).not.toThrow();

    const facets = await request(app).get('/api/v1/admin/facets').set('Authorization', token);
    expect(() => facetsSchema.parse(facets.body.data)).not.toThrow();
  });
});
