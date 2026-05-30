import { z } from 'zod';

export const uploadStatusSchema = z.enum(['PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED']);

// A single rejected row, surfaced to the admin so failures are debuggable.
export const uploadRowErrorSchema = z.object({
  row: z.number().int(),
  column: z.string().optional(),
  message: z.string(),
});

// Summary of a CSV import — the response of POST /admin/reports/upload.
export const uploadBatchSchema = z.object({
  id: z.string(),
  filename: z.string(),
  status: uploadStatusSchema,
  totalRows: z.number().int(),
  insertedRows: z.number().int(),
  skippedRows: z.number().int(),
  failedRows: z.number().int(),
  errors: z.array(uploadRowErrorSchema),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
});
