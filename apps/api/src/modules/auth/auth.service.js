import { UnauthorizedError } from '../../common/errors.js';
import { dummyVerify, verifyPassword } from '../../common/password.js';
import { User } from '../users/user.model.js';
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken } from './token.service.js';

function toAuthUser(user) {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
}

export async function login(input) {
  const user = await User.findOne({ email: input.email });

  // Run the same work whether or not the account exists so response timing
  // doesn't reveal which emails are registered. We also never say which half of
  // the credentials was wrong. Clients imported from a dataset have no
  // passwordHash — they can't log in until one is set, and are rejected here
  // (not handed to verifyPassword, which would throw on a null hash -> 500).
  if (!user || !user.isActive || !user.passwordHash) {
    await dummyVerify();
    throw new UnauthorizedError('Invalid email or password');
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await issueTokenPair({ id: user.id, role: user.role, email: user.email });
  return { user: toAuthUser(user), ...tokens };
}

export function refresh(refreshToken) {
  return rotateRefreshToken(refreshToken);
}

export function logout(refreshToken) {
  return revokeRefreshToken(refreshToken);
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new UnauthorizedError('Account not found');
  }
  return toAuthUser(user);
}
