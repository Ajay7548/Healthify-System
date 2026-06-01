import { z } from 'zod';
import { paginationQuerySchema } from './pagination.js';

// Whether a measured value sits below, within, or above its reference range.
export const metricFlagSchema = z.enum(['LOW', 'NORMAL', 'HIGH']);

// Most metrics are numeric (a value compared against a reference range); a few
// are categorical (e.g. urine protein is Negative/Trace/Positive). Modelling the
// kind explicitly lets the UI render a value or a label without guessing.
export const metricKindSchema = z.enum(['NUMERIC', 'CATEGORICAL']);

export const healthMetricSchema = z.object({
  code: z.string(),
  label: z.string(),
  kind: metricKindSchema,
  // Exactly one of value / valueText is populated, per `kind`.
  value: z.number().nullable(),
  valueText: z.string().nullable(),
  unit: z.string(),
  refLow: z.number().nullable(),
  refHigh: z.number().nullable(),
  flag: metricFlagSchema,
});

// A single report as returned by the API (dates serialized as ISO strings).
// `summary` carries the clinician's note for the report when one exists.
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
