const mongoose = require('mongoose');
module.exports = mongoose.model('User', new mongoose.Schema({ name: { type: String, required: true }, email: { type: String, unique: true, required: true, lowercase: true }, passwordHash: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }));
