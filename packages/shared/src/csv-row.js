import { z } from 'zod';

// Contract for one row of an uploaded health-report CSV (wide format — one row
// is one report). Cells arrive as strings, so numeric metrics are coerced and
// bounded to physiologically plausible ranges; an out-of-range value is far more
// likely a data-entry error than a real reading, so we reject it loudly.
//
// Column -> metric metadata (label/unit/reference range) lives in the API's
// metric catalog, so adding a metric is a one-line change there plus a field here.
const metricValue = (label) => z.coerce.number({ invalid_type_error: `${label} must be a number` });

const emptyToUndefined = (v) => (v === '' || v == null ? undefined : v);

export const csvReportRowSchema = z.object({
  email: z.string().trim().toLowerCase().email('invalid email'),
  report_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)'),
  source: z.preprocess(emptyToUndefined, z.string().trim().min(1).default('csv-upload')),
  hr: metricValue('hr').min(20).max(300),
  systolic: metricValue('systolic').min(50).max(300),
  diastolic: metricValue('diastolic').min(30).max(200),
  glucose: metricValue('glucose').min(20).max(800),
  cholesterol: metricValue('cholesterol').min(50).max(700),
});

// The set of headers a valid upload must contain.
export const CSV_REQUIRED_HEADERS = [
  'email',
  'report_date',
  'source',
  'hr',
  'systolic',
  'diastolic',
  'glucose',
  'cholesterol',
];
