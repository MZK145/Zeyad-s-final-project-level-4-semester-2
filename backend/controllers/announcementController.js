const announcementService = require('../services/announcementService');

async function list(req, res, next) {
  try {
    const items = await announcementService.list(req.params.stationId, req.query.limit);
    res.json({ items });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const item = await announcementService.create(req.params.stationId, req.body.message);
    req.app.locals.io?.to(`station:${req.params.stationId}`).emit('announcement', item);
    res.status(201).json(item);
  } catch (error) { next(error); }
}

module.exports = { list, create };
