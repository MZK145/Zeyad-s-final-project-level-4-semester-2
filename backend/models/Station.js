const mongoose = require('mongoose');

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  line: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
  order: { type: Number, required: true, min: 1 },
  governorate: { type: String, required: true, set: normalize, minlength: 2, maxlength: 100 },
  city: { type: String, required: true, set: normalize, minlength: 2, maxlength: 100 },
  arrivalTime: { type: String, default: '00:00', trim: true, match: timePattern },
  departureTime: { type: String, default: '00:05', trim: true, match: timePattern },
  createdAt: { type: Date, default: Date.now }
});

schema.index({ name: 1, line: 1 }, { unique: true });
module.exports = mongoose.model('Station', schema);
