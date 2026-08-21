require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const { socketHandler } = require('./sockets/socketHandler');

const port = Number(process.env.PORT || 5000);
const server = http.createServer(app);
const io = socketHandler(server);
app.locals.io = io;

async function start() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } else {
    console.warn('MONGO_URI is not set; API will fail for database operations.');
  }

  server.listen(port, () => console.log(`MetroSync alternate backend running on ${port}`));
}

start().catch((error) => {
  console.error('Startup error:', error);
  process.exit(1);
});
