import { validated } from '../middleware/validate.js';
import { sendSuccess, sendPaginated } from '../utils/http-response.js';
import * as reportService from '../services/report.service.js';

export async function getLatest(req, res) {
  // null when the user has no reports yet — the client renders an empty state.
  sendSuccess(res, await reportService.getLatestReport(req.user.id));
}

export async function getHistory(req, res) {
  const { query } = validated(res);
  const { items, pagination } = await reportService.getReportHistory(req.user.id, query);
  sendPaginated(res, items, pagination);
}

export async function getOne(req, res) {
  const { params } = validated(res);
  sendSuccess(res, await reportService.getReportById(req.user.id, params.reportId));
}
