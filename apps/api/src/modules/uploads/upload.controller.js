import { BadRequestError } from '../../common/errors.js';
import { validated } from '../../middleware/validate.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../common/http-response.js';
import * as uploadService from './upload.service.js';

export async function uploadReports(req, res) {
  if (!req.file) {
    throw new BadRequestError('No CSV file was provided (form field name must be "file")');
  }
  const batch = await uploadService.ingestCsv({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    uploadedById: req.user.id,
  });
  sendCreated(res, batch);
}

export async function listUploads(_req, res) {
  const { query } = validated(res);
  const { items, pagination } = await uploadService.listBatches(query);
  sendPaginated(res, items, pagination);
}

export async function getUpload(_req, res) {
  const { params } = validated(res);
  sendSuccess(res, await uploadService.getBatch(params.batchId));
}
