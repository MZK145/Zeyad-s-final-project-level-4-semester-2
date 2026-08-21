require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const Station = require('./models/Station');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

function auth(requiredAdmin = false) {
  return async (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (requiredAdmin && payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Authentication required' });
    }
  };
}

function emitUpdate(req) {
  req.app.locals.io?.emit('stationsUpdated');
}

app.get('/api/v1/health', (_req, res) => res.json({ ok: true }));

app.post('/api/v1/auth/signup', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const exists = await User.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    await User.create({ name: req.body.name, email: req.body.email, passwordHash });
    res.status(201).json({ message: 'Account created' });
  } catch (error) { next(error); }
});

app.post('/api/v1/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@metrosync.local').toLowerCase();
    if (email === adminEmail && password === String(process.env.ADMIN_PASSWORD || 'admin123')) {
      const userId = 'admin-' + Buffer.from(email).toString('hex').slice(0, 12);
      const token = jwt.sign({ id: userId, role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, role: 'admin' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: String(user._id), role: 'user', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: 'user' });
  } catch (error) { next(error); }
});

app.get('/api/v1/stations', async (_req, res, next) => {
  try { res.json(await Station.find().sort({ line: 1, order: 1 }).lean()); } catch (error) { next(error); }
});

app.get('/api/v1/stations/:id', async (req, res, next) => {
  try {
    const station = await Station.findById(req.params.id).lean();
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json(station);
  } catch (error) { next(error); }
});

const stationFields = ['name','line','order','governorate','city','arrivalTime','departureTime'];
app.post('/api/v1/stations', auth(true), async (req, res, next) => {
  try {
    const payload = Object.fromEntries(stationFields.map((key) => [key, req.body[key]]));
    if (!payload.name || !payload.line || !payload.governorate || !payload.city || !Number.isInteger(Number(payload.order))) return res.status(400).json({ error: 'Invalid station data' });
    const station = await Station.create({ ...payload, order: Number(payload.order) });
    emitUpdate(req);
    res.status(201).json(station);
  } catch (error) { next(error); }
});

app.put('/api/v1/stations/:id', auth(true), async (req, res, next) => {
  try {
    const payload = Object.fromEntries(stationFields.map((key) => [key, req.body[key]]));
    payload.order = Number(payload.order);
    const station = await Station.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).lean();
    if (!station) return res.status(404).json({ error: 'Station not found' });
    emitUpdate(req);
    res.json(station);
  } catch (error) { next(error); }
});

app.delete('/api/v1/stations/:id', auth(true), async (req, res, next) => {
  try {
    const station = await Station.findByIdAndDelete(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    emitUpdate(req);
    res.json({ message: 'Station deleted' });
  } catch (error) { next(error); }
});

app.get('/api/v1/users/waiting-rooms', auth(true), async (req, res, next) => {
  try {
    const io = req.app.locals.io;
    const stations = await Station.find().sort({ line: 1, order: 1 }).lean();
    const rooms = stations.map((station) => ({
      stationId: String(station._id), name: station.name, line: station.line,
      governorate: station.governorate, city: station.city,
      onlinePassengers: io?.getStationPresence?.(station._id) || 0,
      active: (io?.getStationPresence?.(station._id) || 0) > 0
    }));
    res.json({ totalRooms: rooms.length, activeRooms: rooms.filter((r) => r.active).length, rooms });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;
