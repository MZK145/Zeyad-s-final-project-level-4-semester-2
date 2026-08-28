const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../app');
const Admin = require('../models/Admin');
const User = require('../models/User');
const stationService = require('../services/stationService');

describe('MetroSync rubric integration tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-with-at-least-32-chars';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /api/v1/stations returns 200 and a JSON array', async () => {
    jest.spyOn(stationService, 'listStations').mockResolvedValue([
      { _id: '1', name: 'Test Station', line: 'Line 1', order: 1 }
    ]);

    const res = await request(app).get('/api/v1/stations');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('valid admin login returns a JWT token with role', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);
    jest.spyOn(Admin, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'admin@example.com',
          passwordHash
        })
      })
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(20);
  });

  test('protected announcement POST without a token returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/stations/507f1f77bcf86cd799439011/announcements')
      .send({ message: 'Test announcement' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  test('invalid login input is rejected before database authentication', async () => {
    const findOne = jest.spyOn(Admin, 'findOne');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(findOne).not.toHaveBeenCalled();
  });

  test('user serialization never exposes passwordHash', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-value'
    });
    expect(user.toJSON().passwordHash).toBeUndefined();
  });
});
