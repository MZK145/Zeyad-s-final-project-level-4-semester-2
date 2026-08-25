const jwt = require('jsonwebtoken');
const stationBySocket = new Map();

function room(id) {
  return `station:${id}`;
}

function count(io, stationId) {
  const set = io.sockets.adapter.rooms.get(room(stationId));
  if (!set) return 0;
  let total = 0;
  for (const id of set) {
    const socket = io.sockets.sockets.get(id);
    if (socket?.data.role === 'user') total += 1;
  }
  return total;
}

// Global online passenger count: authenticated users count immediately after
// Socket.IO connects, even before they join a station waiting room.
function getOnlineCount(io) {
  if (!io) return 0;
  const users = new Set();
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.role === 'user' && socket.data.userId) {
      users.add(String(socket.data.userId));
    }
  }
  return users.size;
}

function announcePresence(io, stationId) {
  io.to(room(stationId)).emit('presenceUpdate', {
    stationId,
    count: count(io, stationId)
  });
}

function broadcastOnlineCount(io) {
  io.emit('onlineCount', getOnlineCount(io));
}

function leave(io, socket) {
  const old = stationBySocket.get(socket.id);
  if (!old) return null;
  socket.leave(room(old));
  stationBySocket.delete(socket.id);
  announcePresence(io, old);
  return old;
}

function socketHandler(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Socket authentication required'));

      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'metroflow-api',
        audience: 'metroflow-client'
      });

      if (!payload?.id || !['admin', 'user'].includes(payload.role)) {
        return next(new Error('Invalid socket identity'));
      }

      socket.data.userId = String(payload.id);
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', (socket) => {
    // Authenticated users are online as soon as the socket connects.
    broadcastOnlineCount(io);

    socket.on('register', (requested) => {
      if (requested && String(requested) !== String(socket.data.userId)) {
        return socket.emit('registerError', { message: 'Socket identity mismatch' });
      }
      socket.emit('registered', {
        userId: socket.data.userId,
        role: socket.data.role
      });
      broadcastOnlineCount(io);
    });

    socket.on('joinStation', (stationId) => {
      const id = String(stationId || '').trim();
      if (!id) return socket.emit('stationError', { message: 'Station id required' });

      const previous = stationBySocket.get(socket.id);
      if (previous === id) {
        announcePresence(io, id);
        broadcastOnlineCount(io);
        return;
      }
      if (previous) leave(io, socket);

      socket.join(room(id));
      stationBySocket.set(socket.id, id);
      announcePresence(io, id);
      broadcastOnlineCount(io);
    });

    socket.on('leaveStation', () => {
      leave(io, socket);
      broadcastOnlineCount(io);
    });

    socket.on('disconnect', () => {
      leave(io, socket);
      broadcastOnlineCount(io);
    });
  });
}

function getStationPresence(io, stationId) {
  return count(io, stationId);
}

module.exports = { socketHandler, getOnlineCount, getStationPresence };
