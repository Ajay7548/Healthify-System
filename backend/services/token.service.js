import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { User } from '../models/user.model.js';
import { RefreshToken } from '../models/refresh-token.model.js';

const ISSUER = 'healthcare-api';
const AUDIENCE = 'healthcare-web';

// We persist only a hash of each refresh token, so a database leak can't be
// turned into a usable session.
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(user) {
  return jwt.sign({ role: user.role, email: user.email }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return { id: String(payload.sub), role: payload.role, email: String(payload.email) };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

// Mint a refresh token within a rotation family and record its hash so it can be
// rotated and revoked. Returns the signed token string.
async function issueRefreshToken(userId, family) {
  const jti = randomUUID();
  const token = jwt.sign({ family }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    jwtid: jti,
    expiresIn: env.JWT_REFRESH_TTL,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  const decoded = jwt.decode(token);

  await RefreshToken.create({
    userId,
    tokenHash: hashToken(token),
    jti,
    family,
    replacedBy: null,
    expiresAt: new Date((decoded?.exp ?? 0) * 1000),
    revokedAt: null,
  });

  return token;
}

// Issue a fresh access + refresh pair at the start of a new session (login).
export async function issueTokenPair(user) {
  const family = randomUUID();
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, family);
  return { accessToken, refreshToken };
}

// Rotate a refresh token: validate it, issue a replacement, and retire the old
// one. If a token that was already rotated or revoked is presented again, we
// treat the whole family as compromised and revoke it — a stolen token can be
// used at most once before both the thief and the victim are locked out.
export async function rotateRefreshToken(presented) {
  try {
    jwt.verify(presented, env.JWT_REFRESH_SECRET, { issuer: ISSUER, audience: AUDIENCE });
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const presentedHash = hashToken(presented);
  const record = await RefreshToken.findOne({ tokenHash: presentedHash });
  if (!record) {
    throw new UnauthorizedError('Refresh token not recognized');
  }

  if (record.revokedAt || record.replacedBy) {
    await revokeFamily(record.family);
    throw new UnauthorizedError('Refresh token reuse detected — please sign in again');
  }

  const userId = String(record.userId);
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    await revokeFamily(record.family);
    throw new UnauthorizedError('Account is no longer active');
  }

  const newRefreshToken = await issueRefreshToken(userId, record.family);
  const newJti = jwt.decode(newRefreshToken)?.jti ?? null;

  // Atomically claim the presented token: only the first concurrent request can
  // flip it from "live" to "rotated". If two requests race with the same token,
  // the loser's update matches nothing — that's reuse, so revoke the family
  // (which also kills the replacement we just minted) and force a re-login.
  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash: presentedHash, revokedAt: null, replacedBy: null },
    { revokedAt: new Date(), replacedBy: typeof newJti === 'string' ? newJti : null },
  );
  if (!claimed) {
    await revokeFamily(record.family);
    throw new UnauthorizedError('Refresh token reuse detected — please sign in again');
  }

  const accessToken = signAccessToken({ id: userId, role: user.role, email: user.email });
  return { accessToken, refreshToken: newRefreshToken };
}

async function revokeFamily(family) {
  await RefreshToken.updateMany({ family, revokedAt: null }, { revokedAt: new Date() });
}

// Revoke the session a refresh token belongs to (logout). Safe to call with an
// unknown or already-revoked token.
export async function revokeRefreshToken(presented) {
  const record = await RefreshToken.findOne({ tokenHash: hashToken(presented) });
  if (record && !record.revokedAt) {
    await revokeFamily(record.family);
  }
}
