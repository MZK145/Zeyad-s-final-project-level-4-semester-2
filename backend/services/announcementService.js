const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Station = require('../models/Station');

function checkStationId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid station id'), { statusCode: 400 });
  }
}

async function list(stationId, options = {}) {
  checkStationId(stationId);

  const page = Math.max(Number.parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(options.limit, 10) || 10, 1), 50);
  const filter = String(options.filter || options.search || '').trim();
  const query = { stationId };

  if (filter) query.message = { $regex: filter, $options: 'i' };

  const [items, totalItems] = await Promise.all([
    Announcement.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Announcement.countDocuments(query)
  ]);

  return {
    items,
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit)
  };
}

async function create(stationId, message) {
  checkStationId(stationId);

  const text = String(message || '').trim();
  if (!text) throw Object.assign(new Error('Announcement message is required'), { statusCode: 400 });

  const stationExists = await Station.exists({ _id: stationId });
  if (!stationExists) throw Object.assign(new Error('Station not found'), { statusCode: 404 });

  return Announcement.create({ stationId, message: text });
}

module.exports = { list, create };
