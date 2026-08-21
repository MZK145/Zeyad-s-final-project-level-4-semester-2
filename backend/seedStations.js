require('dotenv').config();
const mongoose = require('mongoose');
const Station = require('./models/Station');
const defaults = require('./data/defaultStations');
(async () => { await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI); await Station.deleteMany({}); await Station.insertMany(defaults); console.log('Seeded stations'); await mongoose.disconnect(); })().catch(e => { console.error(e); process.exit(1); });
