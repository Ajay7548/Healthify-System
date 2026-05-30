// The single source of truth for the health metrics this system understands.
// Each entry maps a CSV column to the metadata we store and chart. Adding a new
// metric is a one-line change here (plus the matching field in csvReportRowSchema).
//
// Each entry: { column, code, label, unit, refLow, refHigh }. A null bound means
// "no limit on that side" (e.g. cholesterol has only an upper reference bound).
export const METRIC_CATALOG = [
  { column: 'hr', code: 'HR', label: 'Heart Rate', unit: 'bpm', refLow: 60, refHigh: 100 },
  { column: 'systolic', code: 'SBP', label: 'Systolic BP', unit: 'mmHg', refLow: 90, refHigh: 120 },
  {
    column: 'diastolic',
    code: 'DBP',
    label: 'Diastolic BP',
    unit: 'mmHg',
    refLow: 60,
    refHigh: 80,
  },
  {
    column: 'glucose',
    code: 'GLU',
    label: 'Fasting Glucose',
    unit: 'mg/dL',
    refLow: 70,
    refHigh: 99,
  },
  {
    column: 'cholesterol',
    code: 'CHOL',
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    refLow: null,
    refHigh: 200,
  },
];

// Classify a measured value against its reference range.
export function flagFor(value, refLow, refHigh) {
  if (refLow !== null && value < refLow) return 'LOW';
  if (refHigh !== null && value > refHigh) return 'HIGH';
  return 'NORMAL';
}
