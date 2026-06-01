import { Router } from 'express';
import { z } from 'zod';
import { reportHistoryQuerySchema } from '../validation/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as reportController from '../controllers/report.controller.js';

// Validate the id shape ourselves so a bad id is a clean 400 rather than a
// Mongoose cast error surfacing from deeper in the stack.
const reportIdParams = z.object({
  reportId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid report id'),
});

// "/me" — the current user's own data. Self-scoped by req.user.id, so it needs
// authentication but no particular role.
export const meRouter = Router();
meRouter.use(authenticate);

// "/latest" is registered before "/:reportId" so it isn't swallowed by the param.
meRouter.get('/reports/latest', reportController.getLatest);
meRouter.get(
  '/reports',
  validate({ query: reportHistoryQuerySchema }),
  reportController.getHistory,
);
meRouter.get('/reports/:reportId', validate({ params: reportIdParams }), reportController.getOne);
