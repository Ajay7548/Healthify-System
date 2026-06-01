// The single source of truth for the health metrics this system understands.
// Each entry maps a dataset column to the metadata we store, flag, and chart.
// Adding or retiring a metric is a one-line change here plus the matching field
// in the upload row schema (validation/upload-rows.js).
//
// NUMERIC metrics carry a value compared against [refLow, refHigh]; a null bound
// means "no limit on that side" (e.g. cholesterol has only an upper bound).
// CATEGORICAL metrics carry a text result mapped to a flag by `classify`.
export const METRIC_CATALOG = [
  {
    column: 'hemoglobin',
    code: 'HGB',
    label: 'Hemoglobin',
    unit: 'g/dL',
    kind: 'NUMERIC',
    refLow: 12,
    refHigh: 17,
  },
  {
    column: 'blood_sugar_fasting',
    code: 'FBS',
    label: 'Fasting Blood Sugar',
    unit: 'mg/dL',
    kind: 'NUMERIC',
    refLow: 70,
    refHigh: 99,
  },
  {
    column: 'cholesterol',
    code: 'CHOL',
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    kind: 'NUMERIC',
    refLow: null,
    refHigh: 200,
  },
  {
    column: 'vitamin_d',
    code: 'VITD',
    label: 'Vitamin D',
    unit: 'ng/mL',
    kind: 'NUMERIC',
    refLow: 30,
    refHigh: 100,
  },
  {
    column: 'creatinine',
    code: 'CREA',
    label: 'Creatinine',
    unit: 'mg/dL',
    kind: 'NUMERIC',
    refLow: 0.6,
    refHigh: 1.3,
  },
  {
    column: 'bmi',
    code: 'BMI',
    label: 'BMI',
    unit: 'kg/m²',
    kind: 'NUMERIC',
    refLow: 18.5,
    refHigh: 24.9,
  },
  {
    column: 'urine_protein',
    code: 'UPRO',
    label: 'Urine Protein',
    unit: '',
    kind: 'CATEGORICAL',
    refLow: null,
    refHigh: null,
    // Trace and overt (Positive) proteinuria are both worth flagging; only a
    // Negative dipstick is unambiguously normal.
    classify: { Negative: 'NORMAL', Trace: 'HIGH', Positive: 'HIGH' },
  },
];

// Classify a numeric measured value against its reference range.
export function flagFor(value, refLow, refHigh) {
  if (refLow !== null && value < refLow) return 'LOW';
  if (refHigh !== null && value > refHigh) return 'HIGH';
  return 'NORMAL';
}

// Classify a categorical result. An unrecognized label falls back to NORMAL so a
// stray value can never masquerade as an abnormal finding.
export function classifyCategorical(def, text) {
  return def.classify?.[text] ?? 'NORMAL';
}

// Build the embedded metric array for a report from a row keyed by catalog
// columns (e.g. { hemoglobin: 9.8, ..., urine_protein: 'Negative' }). Shared by
// CSV/xlsx ingestion and the seed so their stored shape can never drift apart.
export function buildMetrics(row) {
  return METRIC_CATALOG.map((def) => {
    const base = {
      code: def.code,
      label: def.label,
      kind: def.kind,
      unit: def.unit,
      refLow: def.refLow,
      refHigh: def.refHigh,
    };
    if (def.kind === 'CATEGORICAL') {
      const valueText = row[def.column] ?? null;
      return { ...base, value: null, valueText, flag: classifyCategorical(def, valueText) };
    }
    const value = row[def.column];
    return { ...base, value, valueText: null, flag: flagFor(value, def.refLow, def.refHigh) };
  });
}
