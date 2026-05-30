import { z } from 'zod';
import { paginationQuerySchema } from './pagination.js';

// Whether a measured value sits below, within, or above its reference range.
export const metricFlagSchema = z.enum(['LOW', 'NORMAL', 'HIGH']);

export const healthMetricSchema = z.object({
  code: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  refLow: z.number().nullable(),
  refHigh: z.number().nullable(),
  flag: metricFlagSchema,
});

// A single report as returned by the API (dates serialized as ISO strings).
export const healthReportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  reportDate: z.string(),
  source: z.string(),
  summary: z.string().nullable(),
  metrics: z.array(healthMetricSchema),
  createdAt: z.string(),
});

export const reportHistoryQuerySchema = paginationQuerySchema.extend({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
