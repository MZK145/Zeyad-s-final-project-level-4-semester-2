require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const { socketHandler } = require('./sockets/socketHandler');

// Local development defaults to 5001. Render supplies its own PORT at runtime.
const port = Number(process.env.PORT) || 5001;
const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URI;

// Keep Socket.IO origins aligned with the Express CORS configuration.
// This is important during local development because the frontend normally
// runs on localhost:3000 while the API/socket server runs on localhost:5001.
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
const socketOrigins = [...new Set([...localOrigins, ...configuredOrigins])];
const socketCorsOrigin = socketOrigins.length ? socketOrigins : '*';

function startServer(portToUse) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    const io = require('socket.io')(server, {
      cors: {
        origin: socketCorsOrigin,
        credentials: true
      }
    });
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
