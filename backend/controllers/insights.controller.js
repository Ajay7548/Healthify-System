import { sendSuccess } from '../utils/http-response.js';
import * as insightsService from '../services/insights.service.js';

export async function getInsights(_req, res) {
  sendSuccess(res, await insightsService.getInsights());
}
