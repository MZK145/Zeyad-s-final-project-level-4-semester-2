const express = require('express');
const jwt = require('jsonwebtoken');
const requireAdmin = require('../middleware/requireAdmin');
const User = require('../models/User');
const Station = require('../models/Station');
const { getOnlineCount, getStationPresence, setUserRoom, clearUserRoom } = require('../sockets/socketHandler');
const router = express.Router();

function requireUser(req, res, next) {
  try {
    const authorization = String(req.headers.authorization || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      issuer: 'metroflow-api',
      audience: 'metroflow-client'
    });
    if (!payload?.id || payload.role !== 'user') return res.status(403).json({ error: 'Normal user access required' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

router.get('/', requireAdmin, async (_req, res, next) => {
  try { res.json({ count: await User.countDocuments() }); } catch (e) { next(e); }
});

router.get('/online', requireAdmin, (req, res) => {
  res.json({ count: getOnlineCount(req.app.locals.io), type: 'connected-passengers' });
});

// A normal user explicitly enters the selected station waiting room.
// This supplements Socket.IO room membership so the admin API always has
// an authoritative server-side waiting-room state.
router.post('/waiting-rooms/join', requireUser, (req, res) => {
  const stationId = String(req.body?.stationId || '').trim();
  if (!stationId) return res.status(400).json({ error: 'stationId is required' });
  const io = req.app.locals.io;
  if (!io) return res.status(503).json({ error: 'Live service is not ready' });
  setUserRoom(io, req.user.id, stationId);
  res.json({ ok: true, stationId });
});

router.post('/waiting-rooms/leave', requireUser, (req, res) => {
  const io = req.app.locals.io;
  if (io) clearUserRoom(io, req.user.id);
  res.json({ ok: true });
});

router.get('/waiting-rooms', requireAdmin, async (req, res, next) => {
  try {
    const io = req.app.locals.io;
    const stations = await Station.find().sort({ line: 1, order: 1 }).lean();
    const rooms = stations.map(s => {
      const onlinePassengers = getStationPresence(io, s._id);
      return {
        stationId: String(s._id),
        name: s.name,
        line: s.line,
        governorate: s.governorate,
        city: s.city,
        onlinePassengers,
        active: onlinePassengers > 0
      };
    });
    res.json({
      totalRooms: rooms.length,
      activeRooms: rooms.filter(r => r.active).length,
      onlinePassengers: getOnlineCount(io),
      rooms
    });
  } catch (e) { next(e); }
});

module.exports = router;
