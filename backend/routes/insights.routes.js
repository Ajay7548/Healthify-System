import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import * as insightsController from '../controllers/insights.controller.js';

// Admin-only analytics over the whole client/report population. Mounted under
// /admin, so the path is /admin/insights.
export const adminInsightsRouter = Router();
adminInsightsRouter.use(authenticate, requireRole('ADMIN'));

adminInsightsRouter.get('/insights', insightsController.getInsights);
