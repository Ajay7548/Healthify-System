import { Router } from 'express';
import { z } from 'zod';
import { paginationQuerySchema } from '@hc/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/require-role.js';
import { validate } from '../../middleware/validate.js';
import { uploadDataset } from '../../middleware/upload.js';
import * as uploadController from './upload.controller.js';

const batchIdParams = z.object({
  batchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid batch id'),
});

// Admin-only dataset ingestion + the audit log of past imports. Mounted under /admin.
export const adminUploadsRouter = Router();
adminUploadsRouter.use(authenticate, requireRole('ADMIN'));

adminUploadsRouter.post('/reports/upload', uploadDataset, uploadController.uploadReports);
adminUploadsRouter.get(
  '/uploads',
  validate({ query: paginationQuerySchema }),
  uploadController.listUploads,
);
adminUploadsRouter.get(
  '/uploads/:batchId',
  validate({ params: batchIdParams }),
  uploadController.getUpload,
);
