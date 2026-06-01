import { Schema, model } from 'mongoose';

const metricSchema = new Schema(
  {
    code: { type: String, required: true },
    label: { type: String, required: true },
    // NUMERIC metrics populate `value`; CATEGORICAL ones populate `valueText`.
    kind: { type: String, enum: ['NUMERIC', 'CATEGORICAL'], default: 'NUMERIC', required: true },
    value: { type: Number, default: null },
    valueText: { type: String, default: null },
    // Not `required`: a categorical metric has no unit, and Mongoose treats an
    // empty string as missing for required String paths.
    unit: { type: String, default: '' },
    refLow: { type: Number, default: null },
    refHigh: { type: Number, default: null },
    flag: { type: String, enum: ['LOW', 'NORMAL', 'HIGH'], required: true },
  },
  { _id: false },
);

const healthReportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportDate: { type: Date, required: true },
    source: { type: String, required: true },
    // The clinician's note for the report (the dataset's doctor_notes column).
    summary: { type: String, default: null },
    // Metrics are embedded: they're always read with the report and bounded in size.
    metrics: { type: [metricSchema], default: [] },
    // The original uploaded row, kept for traceability/debugging.
    raw: { type: Schema.Types.Mixed, default: null },
    // The source dataset's own identifiers, retained for traceability.
    externalId: { type: String, default: null },
    externalClientId: { type: Number, default: null },
    uploadBatchId: { type: Schema.Types.ObjectId, ref: 'UploadBatch', default: null },
    dedupeKey: { type: String, required: true },
  },
  { timestamps: true },
);

// Serves both "latest report" (findOne, sort, limit 1) and paginated history
// with no in-memory sort. The single most important index in the system.
healthReportSchema.index({ userId: 1, reportDate: -1 });

// Idempotent imports: the same patient/report can exist only once. Uploads key
// this on the dataset's own report_id; the seed/CSV fall back to a date+source hash.
healthReportSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });

export const HealthReport = model('HealthReport', healthReportSchema);
