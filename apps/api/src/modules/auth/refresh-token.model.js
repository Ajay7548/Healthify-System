import { Schema, model } from 'mongoose';

// Server-side record of an issued refresh token. We store only a SHA-256 hash of
// the token (never the token itself), which lets us revoke sessions and detect
// refresh-token reuse without being able to leak a usable token from the DB.
//
// `family` ties a chain of rotated tokens together: if a token that has already
// been rotated is presented again (a sign it was stolen), we revoke the whole
// family and force a fresh login.
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    jti: { type: String, required: true, index: true },
    family: { type: String, required: true, index: true },
    // jti of the token that superseded this one, once rotated.
    replacedBy: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Let MongoDB purge expired tokens automatically so the collection stays small.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
