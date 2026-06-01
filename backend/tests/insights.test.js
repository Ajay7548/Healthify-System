import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { insightsSchema } from '../validation/index.js';
import { setupTestDb, teardownTestDb, clearCollections } from './db.js';
import { User } from '../models/user.model.js';
import { HealthReport } from '../models/health-report.model.js';
import { buildMetrics } from '../utils/metric-catalog.js';
import { getInsights } from '../services/insights.service.js';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
beforeEach(clearCollections);

const NORMAL = {
  hemoglobin: 14,
  vitamin_d: 50,
  cholesterol: 180,
  blood_sugar_fasting: 90,
  creatinine: 0.9,
  urine_protein: 'Negative',
  bmi: 22,
};

function makeClient(clientId, over = {}) {
  return User.create({
    clientId,
    email: `c${clientId}@test.dev`,
    fullName: `Client ${clientId}`,
    role: 'USER',
    isActive: true,
    age: over.age ?? 30,
    gender: over.gender ?? 'Female',
    state: over.state ?? 'Maharashtra',
    healthCondition: over.healthCondition ?? 'Healthy',
    beautyGoal: over.beautyGoal ?? 'Fitness',
  });
}

function reportFor(userId, row, date) {
  return {
    userId,
    reportDate: new Date(date),
    source: 'test',
    summary: null,
    metrics: buildMetrics(row),
    raw: row,
    dedupeKey: `${userId}-${date}`,
  };
}

describe('insights aggregation', () => {
  it('aggregates totals, breakdowns and per-metric abnormal rates', async () => {
    const alice = await makeClient(1, { gender: 'Female', healthCondition: 'Diabetes', age: 25 });
    const bob = await makeClient(2, { gender: 'Male', state: 'Kerala', age: 65 });

    await HealthReport.create(reportFor(alice._id, NORMAL, '2026-01-01'));
    // Alice's latest report is abnormal (high BMI).
    await HealthReport.create(reportFor(alice._id, { ...NORMAL, bmi: 32 }, '2026-02-01'));
    await HealthReport.create(reportFor(bob._id, NORMAL, '2026-01-15'));

    const insights = await getInsights();
    expect(() => insightsSchema.parse(insights)).not.toThrow();

    expect(insights.totals.clients).toBe(2);
    expect(insights.totals.reports).toBe(3);
    expect(insights.totals.avgReportsPerClient).toBeCloseTo(1.5, 1);
    // Only Alice's latest report is out of range -> 1 of 2 clients.
    expect(insights.totals.abnormalLatestRate).toBeCloseTo(0.5, 5);

    const bmi = insights.abnormalByMetric.find((m) => m.code === 'BMI');
    expect(bmi).toMatchObject({ abnormal: 1, total: 2 });

    expect(insights.byGender.map((g) => g.key).sort()).toEqual(['Female', 'Male']);
    expect(insights.byHealthCondition.find((c) => c.key === 'Diabetes').count).toBe(1);
    expect(insights.byAgeBucket.find((b) => b.key === '18-29').count).toBe(1);
    expect(insights.reportsByMonth.find((m) => m.month === '2026-01').count).toBe(2);
  });
});
