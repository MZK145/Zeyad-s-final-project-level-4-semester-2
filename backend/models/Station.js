const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  line: { type: String, required: true, trim: true },
  order: { type: Number, required: true },
  governorate: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  arrivalTime: { type: String, default: '00:00' },
  departureTime: { type: String, default: '00:05' }
}, { timestamps: true });

stationSchema.index({ name: 1, line: 1 }, { unique: true });
module.exports = mongoose.model('Station', stationSchema);
