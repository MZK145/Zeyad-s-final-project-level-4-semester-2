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

  test('allows the frontend origin used by the Metro app', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:8000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8000');
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
