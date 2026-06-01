import { z } from 'zod';

// Query params arrive as strings, so we coerce. pageSize is clamped to a sane
// maximum — an unbounded page size is a denial-of-service foot-gun.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
