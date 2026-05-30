import { validated } from '../../middleware/validate.js';
import { sendSuccess } from '../../common/http-response.js';
import { UnauthorizedError } from '../../common/errors.js';
import * as authService from './auth.service.js';

export async function login(_req, res) {
  const { body } = validated(res);
  sendSuccess(res, await authService.login(body));
}

export async function refresh(_req, res) {
  const { body } = validated(res);
  sendSuccess(res, await authService.refresh(body.refreshToken));
}

export async function logout(_req, res) {
  const { body } = validated(res);
  await authService.logout(body.refreshToken);
  sendSuccess(res, { loggedOut: true });
}

export async function me(req, res) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  sendSuccess(res, await authService.getCurrentUser(req.user.id));
}
