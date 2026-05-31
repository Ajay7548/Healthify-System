import { z } from 'zod';

export const uploadStatusSchema = z.enum(['PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED']);

// A single rejected row, surfaced to the admin so failures are debuggable.
// `sheet` names the worksheet a row came from (xlsx has clients + health_reports).
export const uploadRowErrorSchema = z.object({
  sheet: z.string().optional(),
  row: z.number().int(),
  column: z.string().optional(),
  message: z.string(),
});

// Summary of an upload (CSV or xlsx) — the response of POST /admin/reports/upload.
// Client counts come from the `clients` sheet; the row counts are health reports.
export const uploadBatchSchema = z.object({
  id: z.string(),
  filename: z.string(),
  status: uploadStatusSchema,
  clientsCreated: z.number().int(),
  clientsUpdated: z.number().int(),
  totalRows: z.number().int(),
  insertedRows: z.number().int(),
  skippedRows: z.number().int(),
  failedRows: z.number().int(),
  errors: z.array(uploadRowErrorSchema),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
});
