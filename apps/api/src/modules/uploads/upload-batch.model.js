import { Schema, model } from 'mongoose';

const rowErrorSchema = new Schema(
  {
    row: { type: Number, required: true },
    column: { type: String },
    message: { type: String, required: true },
  },
  { _id: false },
);

// An audit record for one CSV import. Created the moment an upload starts (so a
// crash mid-parse still leaves a trace) and finalized with the per-row outcome,
// which is what makes a failed import debuggable instead of mysterious.
const uploadBatchSchema = new Schema(
  {
    filename: { type: String, required: true },
    uploadedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED'],
      default: 'PROCESSING',
      required: true,
    },
    totalRows: { type: Number, default: 0 },
    insertedRows: { type: Number, default: 0 },
    skippedRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    // Named rowErrors (not "errors") because Mongoose reserves `errors` on a
    // document for its own validation errors. Exposed to the API as `errors`.
    rowErrors: { type: [rowErrorSchema], default: [] },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

uploadBatchSchema.index({ uploadedById: 1, createdAt: -1 });

export const UploadBatch = model('UploadBatch', uploadBatchSchema);
