import { describe, expect, it } from 'vitest';
import { flagFor } from './metric-catalog.js';
import { reportDedupeKey } from './dedupe.js';

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
