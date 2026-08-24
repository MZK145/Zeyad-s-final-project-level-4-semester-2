const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const stationRoutes = require('./routes/stationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const localOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'null'
];
const configuredOrigins = String(process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...localOrigins, ...configuredOrigins]);

function corsOrigin(origin, callback) {
  return callback(null, !origin || allowedOrigins.has(origin));
}

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/', (_req, res) => res.json({
  name: 'MetroFlow API',
  status: 'ok',
  health: '/api/v1/health'
}));
app.get('/api/v1/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/stations', stationRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1', announcementRoutes);
app.use((req, res) => res.status(404).json({
  error: `Route not found: ${req.method} ${req.originalUrl}`
}));
app.use(errorHandler);

module.exports = app;
