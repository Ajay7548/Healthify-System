import { sendSuccess } from '../../common/http-response.js';
import * as insightsService from './insights.service.js';

export async function getInsights(_req, res) {
  sendSuccess(res, await insightsService.getInsights());
}
