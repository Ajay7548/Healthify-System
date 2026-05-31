import { z } from 'zod';

// Contracts for the rows of an uploaded dataset. The company's file is an .xlsx
// with two sheets — `clients` (one row per person) and `health_reports` (one row
// per lab report, linked by client_id) — and a single-sheet CSV of health_reports
// is also accepted. Cells arrive as strings (CSV) or native numbers/dates (xlsx),
// so numeric fields are coerced and bounded to physiologically plausible ranges:
// an out-of-range value is far likelier a data-entry error than a real reading.
//
// These bounds are deliberately wide (plausibility, not clinical normality). The
// narrow reference ranges that drive LOW/NORMAL/HIGH flags live in the API's
// metric catalog, so the two concerns stay separate.

const emptyToUndefined = (v) => (v === '' || v == null ? undefined : v);
const trimmed = (v) => (typeof v === 'string' ? v.trim() : v);

const metric = (label, min, max) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(min, `${label} is implausibly low`)
    .max(max, `${label} is implausibly high`);

// Dates are normalized to YYYY-MM-DD by the parser (xlsx Date cells are formatted,
// CSV strings are passed through) before they reach these schemas.
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)');

const optionalText = (max = 120) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const clientRowSchema = z.object({
  client_id: z.coerce.number({ invalid_type_error: 'client_id must be a number' }).int().positive(),
  full_name: z.preprocess(trimmed, z.string().min(1, 'full_name is required')),
  email: z.string().trim().toLowerCase().email('invalid email'),
  mobile: z.preprocess(emptyToUndefined, z.string().trim().min(3).max(20).optional()),
  city: optionalText(),
  state: optionalText(),
  age: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(120).optional()),
  gender: optionalText(40),
  occupation: optionalText(),
  health_condition: optionalText(),
  beauty_goal: optionalText(),
  created_at: z.preprocess(emptyToUndefined, isoDate.optional()),
});

// The allowed lab-result values for the one categorical metric.
export const URINE_PROTEIN_VALUES = ['Negative', 'Trace', 'Positive'];

export const healthReportRowSchema = z
  .object({
    report_id: optionalText(60),
    // A report links to a client by the dataset's client_id, or by email when a
    // CSV omits the id. At least one is required (enforced below).
    client_id: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().optional(),
    ),
    email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email().optional()),
    report_date: isoDate,
    hemoglobin: metric('hemoglobin', 3, 25),
    vitamin_d: metric('vitamin_d', 0, 200),
    cholesterol: metric('cholesterol', 50, 700),
    blood_sugar_fasting: metric('blood_sugar_fasting', 20, 800),
    creatinine: metric('creatinine', 0.1, 20),
    urine_protein: z.preprocess(trimmed, z.enum(URINE_PROTEIN_VALUES)),
    bmi: metric('bmi', 8, 80),
    doctor_notes: optionalText(280),
  })
  .refine((row) => row.client_id != null || row.email != null, {
    message: 'client_id or email is required to link the report to a client',
    path: ['client_id'],
  });

export const CLIENT_HEADERS = [
  'client_id',
  'full_name',
  'email',
  'mobile',
  'city',
  'state',
  'age',
  'gender',
  'occupation',
  'health_condition',
  'beauty_goal',
  'created_at',
];

export const HEALTH_REPORT_HEADERS = [
  'report_id',
  'client_id',
  'report_date',
  'hemoglobin',
  'vitamin_d',
  'cholesterol',
  'blood_sugar_fasting',
  'creatinine',
  'urine_protein',
  'bmi',
  'doctor_notes',
];

// The columns a health_reports sheet/CSV must contain to be ingestible (a client
// link, the date, and every metric). report_id and doctor_notes are optional.
export const HEALTH_REPORT_REQUIRED_HEADERS = [
  'report_date',
  'hemoglobin',
  'vitamin_d',
  'cholesterol',
  'blood_sugar_fasting',
  'creatinine',
  'urine_protein',
  'bmi',
];
