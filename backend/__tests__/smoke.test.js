const request = require('supertest');
const app = require('../app');
const authService = require('../services/authService');
const User = require('../models/User');

describe('MetroFlow smoke tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  test('GET / returns API metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('MetroFlow API');
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/v1/health returns healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test.each(['http://localhost:8000', 'null'])('allows frontend origin %s', async (origin) => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', origin);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  test('rejects invalid login input before touching the database', async () => {
    const originalFindOne = User.findOne;
    User.findOne = jest.fn();

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(User.findOne).not.toHaveBeenCalled();

    User.findOne = originalFindOne;
  });

  test('login rejects a user record with a missing password hash without crashing', async () => {
    const originalFindOne = User.findOne;
    User.findOne = jest.fn().mockResolvedValue({ _id: 'bad-user', email: 'bad@example.com' });

    await expect(
      authService.login({ email: 'bad@example.com', password: '123456' })
    ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' });

    User.findOne = originalFindOne;
  });
});
