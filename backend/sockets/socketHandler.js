const jwt = require('jsonwebtoken');

function stationRoom(id) { return `station:${String(id)}`; }
function countUsers(io, stationId) {
  const room = io.sockets.adapter.rooms.get(stationRoom(stationId));
  if (!room) return 0;
  let count = 0;
  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);
    if (s?.data.role === 'user') count += 1;
  }
  return count;
}

function socketHandler(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, { cors: { origin: '*' } });
  const memberships = new Map();

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!payload?.id) throw new Error('invalid token');
      socket.data.userId = String(payload.id);
      socket.data.role = payload.role || 'user';
      next();
    } catch { next(new Error('Invalid or expired session')); }
  });

  function leave(socket) {
    const old = memberships.get(socket.id);
    if (!old) return;
    socket.leave(stationRoom(old));
    memberships.delete(socket.id);
    io.to(stationRoom(old)).emit('roomCount', { stationId: old, count: countUsers(io, old) });
  }

  io.on('connection', (socket) => {
    socket.on('joinStation', (stationId) => {
      const id = String(stationId || '').trim();
      if (!id) return;
      leave(socket);
      socket.join(stationRoom(id));
      memberships.set(socket.id, id);
      io.to(stationRoom(id)).emit('roomCount', { stationId: id, count: countUsers(io, id) });
    });

    socket.on('leaveStation', () => leave(socket));
    socket.on('disconnect', () => leave(socket));
  });

  io.getStationPresence = (stationId) => countUsers(io, stationId);
  return io;
}

module.exports = { socketHandler };
