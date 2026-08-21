const mongoose = require('mongoose');
module.exports = mongoose.model('Announcement', new mongoose.Schema({ stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true }, message: { type: String, required: true, trim: true, maxlength: 500 }, createdAt: { type: Date, default: Date.now } }));
