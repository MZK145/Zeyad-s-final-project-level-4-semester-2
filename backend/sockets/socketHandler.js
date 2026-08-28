const jwt = require('jsonwebtoken');
const stationBySocket = new Map();
const waitingRoomByUser = new Map();

function room(id) { return `station:${id}`; }

function count(io, stationId) {
  const wanted = String(stationId);
  const onlineUsers = new Set();
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.role === 'user' && socket.data.userId) onlineUsers.add(String(socket.data.userId));
  }
  let total = 0;
  for (const userId of onlineUsers) {
    if (waitingRoomByUser.get(userId) === wanted) total += 1;
  }
  return total;
}

function getOnlineCount(io) {
  if (!io) return 0;
  const users = new Set();
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.role === 'user' && socket.data.userId) users.add(String(socket.data.userId));
  }
  return users.size;
}

function announcePresence(io, stationId) {
  io.to(room(stationId)).emit('presenceUpdate', { stationId: String(stationId), count: count(io, stationId) });
}

function broadcastOnlineCount(io) { io.emit('onlineCount', getOnlineCount(io)); }

function clearUserRoom(io, userId) {
  const id = String(userId || '');
  const old = waitingRoomByUser.get(id);
  if (!old) return null;
  waitingRoomByUser.delete(id);
  announcePresence(io, old);
  return old;
}

function setUserRoom(io, userId, stationId) {
  const user = String(userId || '');
  const station = String(stationId || '').trim();
  if (!user || !station) return null;
  const old = waitingRoomByUser.get(user);
  if (old && old !== station) {
    waitingRoomByUser.delete(user);
    announcePresence(io, old);
  }
  waitingRoomByUser.set(user, station);
  announcePresence(io, station);
  return station;
}

function clearSocketStation(io, socket) {
  const old = stationBySocket.get(socket.id);
  if (old) {
    socket.leave(room(old));
    stationBySocket.delete(socket.id);
    announcePresence(io, old);
  }
  return old || null;
}

function socketHandler(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Socket authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'metroflow-api', audience: 'metroflow-client'
      });
      if (!payload?.id || !['admin', 'user'].includes(payload.role)) return next(new Error('Invalid socket identity'));
      socket.data.userId = String(payload.id);
      socket.data.role = payload.role;
      next();
    } catch { next(new Error('Invalid or expired socket token')); }
  });

  io.on('connection', (socket) => {
    socket.emit('onlineCount', getOnlineCount(io));
    broadcastOnlineCount(io);

    if (socket.data.role === 'user' && waitingRoomByUser.has(socket.data.userId)) {
      const stationId = waitingRoomByUser.get(socket.data.userId);
      socket.join(room(stationId));
      stationBySocket.set(socket.id, stationId);
      announcePresence(io, stationId);
    }

    socket.on('register', (requested) => {
      if (requested && String(requested) !== String(socket.data.userId)) return socket.emit('registerError', { message: 'Socket identity mismatch' });
      socket.emit('registered', { userId: socket.data.userId, role: socket.data.role });
      broadcastOnlineCount(io);
    });

    socket.on('joinStation', (stationId) => {
      const id = String(stationId || '').trim();
      if (!id) return socket.emit('stationError', { message: 'Station id required' });
      const previous = stationBySocket.get(socket.id);
      if (previous && previous !== id) clearSocketStation(io, socket);
      socket.join(room(id));
      stationBySocket.set(socket.id, id);
      if (socket.data.role === 'user') setUserRoom(io, socket.data.userId, id);
      announcePresence(io, id);
      broadcastOnlineCount(io);
    });

    socket.on('leaveStation', () => {
      clearSocketStation(io, socket);
      if (socket.data.role === 'user') clearUserRoom(io, socket.data.userId);
      broadcastOnlineCount(io);
    });

    socket.on('disconnect', () => {
      clearSocketStation(io, socket);
      // Do not clear waitingRoomByUser here. The normal-user client may be
      // reconnecting, and the API heartbeat will keep the room state alive.
      broadcastOnlineCount(io);
    });
  });
}

function getStationPresence(io, stationId) { return count(io, stationId); }

module.exports = { socketHandler, getOnlineCount, getStationPresence, setUserRoom, clearUserRoom };
