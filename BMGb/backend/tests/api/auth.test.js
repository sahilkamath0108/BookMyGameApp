const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const { User } = require('../../models');
const { resetState, closeDb, createUser, tokenFor, bearer } = require('../helpers');

beforeEach(resetState);
afterAll(closeDb);

describe('GET /health', () => {
  it('reports the server is running', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/users/register', () => {
  const payload = { Name: 'Ada', email: 'ada@example.test', password: 'Password123!' };

  it('creates a user, returns a valid token, and never returns the password', async () => {
    const res = await request(app).post('/api/users/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(payload.email);
    expect(res.body.data.user.password).toBeUndefined();

    const decoded = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(res.body.data.user.user_id);
  });

  it('stores the password hashed', async () => {
    await request(app).post('/api/users/register').send(payload);

    const user = await User.findOne({ where: { email: payload.email } });
    expect(user.password).not.toBe(payload.password);
    expect(user.password).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/users/register').send(payload);
    const res = await request(app).post('/api/users/register').send(payload);
    expect(res.status).toBe(409);
  });

  it('rejects an invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...payload, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('ignores fields clients may not set', async () => {
    const chosenId = '00000000-0000-4000-8000-000000000000';

    const res = await request(app)
      .post('/api/users/register')
      .send({
        ...payload,
        user_id: chosenId,
        overall_gamer_rating: { skill: 9999 },
        reset_otp: '123456'
      });

    expect(res.status).toBe(201);
    const user = await User.findOne({ where: { email: payload.email } });
    expect(user.user_id).not.toBe(chosenId);
    expect(user.overall_gamer_rating).toEqual({});
    expect(user.reset_otp).toBeNull();
  });
});

describe('PATCH /api/users/profile', () => {
  const update = (user, body) =>
    request(app).patch('/api/users/profile').set('Authorization', bearer(user)).send(body);

  const login = (user, password) =>
    request(app).post('/api/users/login').send({ email: user.email, password });

  it('updates name and gamer tags without changing the password', async () => {
    const user = await createUser({ password: 'Password123!' });

    const res = await update(user, { Name: 'New Name', GamerTag: { valorant: 'ace' } });

    expect(res.status).toBe(200);
    await user.reload();
    expect(user.Name).toBe('New Name');
    expect(user.GamerTag).toEqual({ valorant: 'ace' });
    expect((await login(user, 'Password123!')).status).toBe(200);
  });

  it('hashes a new password, which then works for login', async () => {
    const user = await createUser({ password: 'Password123!' });

    const res = await update(user, { password: 'NewPassword456!' });

    expect(res.status).toBe(200);
    await user.reload();
    expect(user.password).toMatch(/^\$2[aby]\$/);
    expect((await login(user, 'NewPassword456!')).status).toBe(200);
    expect((await login(user, 'Password123!')).status).toBe(401);
  });

  it('rejects an email change', async () => {
    const user = await createUser();
    const res = await update(user, { email: 'new@example.test' });
    expect(res.status).toBe(400);
  });

  it('ignores fields clients may not set', async () => {
    const user = await createUser();
    const originalId = user.user_id;

    const res = await update(user, {
      user_id: '00000000-0000-4000-8000-000000000000',
      overall_gamer_rating: { skill: 9999 },
      reset_otp: '123456',
      profile_pic: 'someone-elses-file.png'
    });

    expect(res.status).toBe(200);
    const stored = await User.findByPk(originalId);
    expect(stored.overall_gamer_rating).toEqual({});
    expect(stored.reset_otp).toBeNull();
    expect(stored.profile_pic).toBeNull();
  });
});

describe('POST /api/users/login', () => {
  it('returns a token for correct credentials', async () => {
    const user = await createUser({ password: 'Password123!' });

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.password).toBeUndefined();
    expect(jwt.verify(res.body.data.token, process.env.JWT_SECRET).id).toBe(user.user_id);
  });

  it('rejects a wrong password with 401', async () => {
    const user = await createUser({ password: 'Password123!' });

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.data).toBeUndefined();
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'nobody@example.test', password: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('authenticate middleware', () => {
  const profile = () => request(app).get('/api/users/profile');

  it('rejects a request with no token', async () => {
    const res = await profile();
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('rejects a malformed token', async () => {
    const res = await profile().set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('rejects a token signed with a different secret', async () => {
    const user = await createUser();
    const forged = jwt.sign({ id: user.user_id }, 'some-other-secret');
    const res = await profile().set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('rejects an expired token', async () => {
    const user = await createUser();
    const expired = tokenFor(user, { expiresIn: -10 });
    const res = await profile().set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token expired');
  });

  it('rejects a token for a user that no longer exists', async () => {
    const user = await createUser();
    const auth = bearer(user);
    await user.destroy();
    const res = await profile().set('Authorization', auth);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('User no longer exists');
  });

  it('lets a valid token through to the profile', async () => {
    const user = await createUser();
    const res = await profile().set('Authorization', bearer(user));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain(user.email);
    expect(JSON.stringify(res.body)).not.toContain(user.password);
  });
});
