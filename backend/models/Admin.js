const mongoose = require('mongoose');
module.exports = mongoose.model('Admin', new mongoose.Schema({ email: { type: String, unique: true }, passwordHash: String }));
