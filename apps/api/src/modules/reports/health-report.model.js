import { Schema, model } from 'mongoose';

const metricSchema = new Schema(
  {
    code: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
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
    summary: { type: String, default: null },
    // Metrics are embedded: they're always read with the report and bounded in size.
    metrics: { type: [metricSchema], default: [] },
    // The original CSV row, kept for traceability/debugging.
    raw: { type: Schema.Types.Mixed, default: null },
    uploadBatchId: { type: Schema.Types.ObjectId, ref: 'UploadBatch', default: null },
    dedupeKey: { type: String, required: true },
  },
  { timestamps: true },
);

// Serves both "latest report" (findOne, sort, limit 1) and paginated history
// with no in-memory sort. The single most important index in the system.
healthReportSchema.index({ userId: 1, reportDate: -1 });

// Idempotent imports: the same patient/date/source can exist only once.
healthReportSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });

export const HealthReport = model('HealthReport', healthReportSchema);
