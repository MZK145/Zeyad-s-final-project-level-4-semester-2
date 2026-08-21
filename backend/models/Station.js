const mongoose = require('mongoose');
function normalize(value) { return String(value || '').trim().replace(/\s+/g, ' '); }
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  line: { type: String, required: true, trim: true },
  order: { type: Number, required: true },
  governorate: { type: String, required: true, set: normalize },
  city: { type: String, required: true, set: normalize },
  arrivalTime: { type: String, default: '00:00', trim: true },
  departureTime: { type: String, default: '00:05', trim: true },
  createdAt: { type: Date, default: Date.now }
});
schema.index({ name: 1, line: 1 }, { unique: true });
module.exports = mongoose.model('Station', schema);
