import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearCollections } from './db.js';
import { User } from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';

const app = createApp();
const credentials = { email: 'patient@test.dev', password: 'Secret123!' };

beforeAll(setupTestDb);
afterAll(teardownTestDb);
beforeEach(async () => {
  await clearCollections();
  await User.create({
    email: credentials.email,
    passwordHash: await hashPassword(credentials.password),
    fullName: 'Test Patient',
    role: 'USER',
    isActive: true,
  });
});

async function login() {
  return request(app).post('/api/v1/auth/login').send(credentials);
}

describe('auth', () => {
  it('logs in with valid credentials and returns a token pair', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('rejects a wrong password without revealing which field was wrong', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...credentials, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects login for an imported client with no password (401, not 500)', async () => {
    await User.create({
      email: 'imported@test.dev',
      fullName: 'Imported Client',
      role: 'USER',
      isActive: true,
      // no passwordHash
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'imported@test.dev', password: 'anything' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('validates the request body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nope', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the current user from /me with a valid token', async () => {
    const { body } = await login();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(credentials.email);
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const { body } = await login();
    const original = body.data.refreshToken;

    const rotated = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: original });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.refreshToken).not.toBe(original);

    // Reusing the original (already-rotated) token signals theft.
    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original });
    expect(reuse.status).toBe(401);

    // ...and the whole family is now revoked, including the rotated token.
    const afterReuse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.data.refreshToken });
    expect(afterReuse.status).toBe(401);
  });
});
