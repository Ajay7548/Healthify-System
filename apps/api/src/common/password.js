import bcrypt from 'bcryptjs';

// bcrypt is a deliberate, deployment-friendly choice: it's pure JS (no native
// build step, so the Docker image and Render build "just work") and remains an
// OWASP-acceptable password hash at a sufficient cost factor. argon2id would be
// the preference for a high-security production system; isolating hashing behind
// this module means swapping the algorithm is a one-file change.
const COST_FACTOR = 12;

// Pre-computed so dummyVerify() does the same work as a real comparison without
// hashing on every call.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST_FACTOR);

export function hashPassword(plain) {
  return bcrypt.hash(plain, COST_FACTOR);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Spend roughly the same time as a real verification when the account doesn't
// exist, so an attacker can't distinguish "no such user" from "wrong password"
// by timing the response.
export async function dummyVerify() {
  await bcrypt.compare('not-a-real-password', DUMMY_HASH);
}
