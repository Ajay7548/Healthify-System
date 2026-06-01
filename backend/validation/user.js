import { z } from 'zod';
import { paginationQuerySchema } from './pagination.js';
import { roleSchema } from './auth.js';

export const userSortFieldSchema = z.enum(['createdAt', 'fullName', 'email', 'age']);
export const sortDirSchema = z.enum(['asc', 'desc']);

// Admin user-list query. sortBy is an allow-list (never raw input fed to the
// database sort); isActive arrives as the string "true"/"false" from the URL.
// The demographic params power the faceted filters over the imported clientele.
export const adminUserQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  sortBy: userSortFieldSchema.default('createdAt'),
  sortDir: sortDirSchema.default('desc'),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  role: roleSchema.optional(),
  healthCondition: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  gender: z.string().trim().max(40).optional(),
  beautyGoal: z.string().trim().max(100).optional(),
  occupation: z.string().trim().max(100).optional(),
  ageMin: z.coerce.number().int().min(0).max(120).optional(),
  ageMax: z.coerce.number().int().min(0).max(120).optional(),
});

// Demographic fields shared by the list row and the detail view. Nullable because
// legacy/seeded accounts predate the imported-client fields.
const demographics = {
  age: z.number().int().nullable(),
  gender: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  healthCondition: z.string().nullable(),
};

export const adminUserListItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  lastReportDate: z.string().nullable(),
  ...demographics,
});

export const adminUserDetailSchema = adminUserListItemSchema.extend({
  clientId: z.number().int().nullable(),
  mobile: z.string().nullable(),
  occupation: z.string().nullable(),
  beautyGoal: z.string().nullable(),
  mrn: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  reportCount: z.number().int(),
});
