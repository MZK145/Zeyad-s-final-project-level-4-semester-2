const stationService = require('../services/stationService');
async function getStations(req, res, next) { try { res.json(await stationService.listStations()); } catch (error) { next(error); } }
module.exports = { getStations };
