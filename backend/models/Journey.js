const mongoose = require('mongoose');
module.exports = mongoose.model('Journey', new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, originStationId: mongoose.Schema.Types.ObjectId, destinationStationId: mongoose.Schema.Types.ObjectId, selectedTrain: Date, createdAt: { type: Date, default: Date.now } }));
