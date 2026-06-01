import { validated } from '../middleware/validate.js';
import { sendSuccess, sendPaginated } from '../utils/http-response.js';
import * as userService from '../services/user.service.js';

export async function listUsers(_req, res) {
  const { query } = validated(res);
  const { items, pagination } = await userService.searchUsers(query);
  sendPaginated(res, items, pagination);
}

export async function getFacets(_req, res) {
  sendSuccess(res, await userService.getFacets());
}

export async function getUser(_req, res) {
  const { params } = validated(res);
  sendSuccess(res, await userService.getUserDetail(params.userId));
}

export async function getUserReports(_req, res) {
  const { params, query } = validated(res);
  const { items, pagination } = await userService.getUserReports(params.userId, query);
  sendPaginated(res, items, pagination);
}
