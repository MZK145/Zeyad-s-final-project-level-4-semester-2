const Station = require('../models/Station');
async function listStations() {
  return Station.find().sort({ line: 1, order: 1 }).lean();
}
module.exports = { listStations };
