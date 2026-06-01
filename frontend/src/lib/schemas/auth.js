import { z } from 'zod';

export const roleSchema = z.enum(['USER', 'ADMIN']);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'A refresh token is required'),
});

// The principal the client cares about — deliberately free of sensitive fields.
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: roleSchema,
});

export const authResultSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});
