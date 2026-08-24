require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const { socketHandler } = require('./sockets/socketHandler');

const port = Number(process.env.PORT) || 5000;
const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URI;
const socketOrigins = String(process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const socketCorsOrigin = socketOrigins.length ? socketOrigins : '*';

function startServer(portToUse) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    const io = require('socket.io')(server, { cors: { origin: socketCorsOrigin } });
    app.locals.io = io;
    socketHandler(io);

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        return reject(new Error(`Port ${portToUse} is already in use. Stop the other MetroFlow process or change PORT.`));
      }
      return reject(error);
    });

    server.listen(portToUse, () => {
      console.log(`🚀 MetroFlow API listening on http://localhost:${portToUse}`);
      resolve({ server, io, port: portToUse });
    });
  });
}

async function start() {
  if (!mongoUrl) throw new Error('MONGO_URI is required');
  if (!String(process.env.JWT_SECRET || '').trim()) throw new Error('JWT_SECRET is required');

  await mongoose.connect(mongoUrl);
  console.log(`✅ MongoDB connected successfully to ${mongoose.connection.host}`);
  await startServer(port);
}

start().catch((error) => {
  console.error('❌ MongoDB/API startup failed:', error.message);
  process.exit(1);
});
