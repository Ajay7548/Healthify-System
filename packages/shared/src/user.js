import { z } from 'zod';
import { paginationQuerySchema } from './pagination.js';
import { roleSchema } from './auth.js';

export const userSortFieldSchema = z.enum(['createdAt', 'fullName', 'email']);
export const sortDirSchema = z.enum(['asc', 'desc']);

// Admin user-list query. sortBy is an allow-list (never raw input fed to the
// database sort) and isActive arrives as the string "true"/"false" from the URL.
export const adminUserQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  sortBy: userSortFieldSchema.default('createdAt'),
  sortDir: sortDirSchema.default('desc'),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  role: roleSchema.optional(),
});

export const adminUserListItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  lastReportDate: z.string().nullable(),
});

export const adminUserDetailSchema = adminUserListItemSchema.extend({
  mrn: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  reportCount: z.number().int(),
});
