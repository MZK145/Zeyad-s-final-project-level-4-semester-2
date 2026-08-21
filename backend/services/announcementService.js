const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
function checkStationId(id) { if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error('Invalid station id'), { statusCode: 400 }); }
async function list(stationId, limit = 10) { checkStationId(stationId); const safe = Math.min(Math.max(Number(limit) || 10, 1), 50); return Announcement.find({ stationId }).sort({ createdAt: -1 }).limit(safe).lean(); }
async function create(stationId, message) { checkStationId(stationId); const text = String(message || '').trim(); if (!text) throw Object.assign(new Error('Announcement message is required'), { statusCode: 400 }); return Announcement.create({ stationId, message: text }); }
module.exports = { list, create };
