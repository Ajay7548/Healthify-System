import { z } from 'zod';

// Admin analytics over the whole client/report population. Every array is a
// pre-aggregated, ready-to-chart breakdown so the client does no number-crunching.

// A labelled count, e.g. { key: 'Diabetes', count: 543 }.
export const insightCountSchema = z.object({
  key: z.string(),
  count: z.number().int(),
});

// How often a metric is out of range across clients' most recent reports.
export const metricAbnormalSchema = z.object({
  code: z.string(),
  label: z.string(),
  total: z.number().int(),
  abnormal: z.number().int(),
  rate: z.number(), // abnormal / total, 0..1
});

// Report volume for a single month, keyed YYYY-MM for stable sorting.
export const monthCountSchema = z.object({
  month: z.string(),
  count: z.number().int(),
});

export const insightsSchema = z.object({
  totals: z.object({
    clients: z.number().int(),
    reports: z.number().int(),
    avgReportsPerClient: z.number(),
    // Share of clients whose latest report has at least one out-of-range metric.
    abnormalLatestRate: z.number(),
  }),
  byHealthCondition: z.array(insightCountSchema),
  byState: z.array(insightCountSchema),
  byGender: z.array(insightCountSchema),
  byAgeBucket: z.array(insightCountSchema),
  byBeautyGoal: z.array(insightCountSchema),
  abnormalByMetric: z.array(metricAbnormalSchema),
  reportsByMonth: z.array(monthCountSchema),
});

// Distinct values that power the admin user-list filter dropdowns.
export const facetsSchema = z.object({
  healthConditions: z.array(z.string()),
  states: z.array(z.string()),
  genders: z.array(z.string()),
  beautyGoals: z.array(z.string()),
  occupations: z.array(z.string()),
});
