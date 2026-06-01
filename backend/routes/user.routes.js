import { Router } from 'express';
import { z } from 'zod';
import { adminUserQuerySchema, reportHistoryQuerySchema } from '../validation/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import * as userController from '../controllers/user.controller.js';

const userIdParams = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id'),
});

// Admin-only user management. Mounted under /admin, so paths are /admin/users…
// The role check is the real gate; the frontend guard only mirrors it.
export const adminUsersRouter = Router();
adminUsersRouter.use(authenticate, requireRole('ADMIN'));

// Distinct demographic values for the user-list filter dropdowns.
adminUsersRouter.get('/facets', userController.getFacets);
adminUsersRouter.get('/users', validate({ query: adminUserQuerySchema }), userController.listUsers);
adminUsersRouter.get('/users/:userId', validate({ params: userIdParams }), userController.getUser);
adminUsersRouter.get(
  '/users/:userId/reports',
  validate({ params: userIdParams, query: reportHistoryQuerySchema }),
  userController.getUserReports,
);
