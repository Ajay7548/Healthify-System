import { describe, expect, it } from 'vitest';
import { flagFor, classifyCategorical, buildMetrics, METRIC_CATALOG } from '../utils/metric-catalog.js';
import { reportDedupeKey } from '../utils/dedupe.js';

describe('flagFor', () => {
  it('flags values below the low bound as LOW', () => {
    expect(flagFor(50, 60, 100)).toBe('LOW');
  });
  it('flags values above the high bound as HIGH', () => {
    expect(flagFor(130, 60, 100)).toBe('HIGH');
  });
  it('treats in-range values as NORMAL', () => {
    expect(flagFor(80, 60, 100)).toBe('NORMAL');
  });
  it('ignores a bound that is null (one-sided range)', () => {
    expect(flagFor(10, null, 100)).toBe('NORMAL');
    expect(flagFor(250, null, 200)).toBe('HIGH');
  });
});

describe('classifyCategorical', () => {
  const urine = METRIC_CATALOG.find((m) => m.code === 'UPRO');

  it('maps Negative to NORMAL and Trace/Positive to HIGH', () => {
    expect(classifyCategorical(urine, 'Negative')).toBe('NORMAL');
    expect(classifyCategorical(urine, 'Trace')).toBe('HIGH');
    expect(classifyCategorical(urine, 'Positive')).toBe('HIGH');
  });
  it('falls back to NORMAL for an unrecognized label', () => {
    expect(classifyCategorical(urine, 'Inconclusive')).toBe('NORMAL');
  });
});

describe('buildMetrics', () => {
  it('builds numeric and categorical metrics with the right flags', () => {
    const metrics = buildMetrics({
      hemoglobin: 10, // < 12 -> LOW
      vitamin_d: 50,
      cholesterol: 250, // > 200 -> HIGH
      blood_sugar_fasting: 90,
      creatinine: 0.9,
      urine_protein: 'Positive',
      bmi: 22,
    });
    expect(metrics).toHaveLength(METRIC_CATALOG.length);

    const hgb = metrics.find((m) => m.code === 'HGB');
    expect(hgb).toMatchObject({ kind: 'NUMERIC', value: 10, valueText: null, flag: 'LOW' });

    const chol = metrics.find((m) => m.code === 'CHOL');
    expect(chol.flag).toBe('HIGH');

    const upro = metrics.find((m) => m.code === 'UPRO');
    expect(upro).toMatchObject({ kind: 'CATEGORICAL', value: null, valueText: 'Positive', flag: 'HIGH' });
  });
});

describe('reportDedupeKey', () => {
  it('is stable regardless of email/source casing and date precision', () => {
    const a = reportDedupeKey('Jane@Example.com', '2026-01-01', 'Acme-Lab');
    const b = reportDedupeKey('jane@example.com', '2026-01-01T12:00:00Z', 'acme-lab');
    expect(a).toBe(b);
  });
  it('differs for different reports', () => {
    expect(reportDedupeKey('a@x.dev', '2026-01-01', 'lab')).not.toBe(
      reportDedupeKey('a@x.dev', '2026-01-02', 'lab'),
    );
  });
});
