const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const controller = require('../controllers/announcementController');
const router = express.Router();
router.get('/stations/:stationId/announcements', controller.list);
router.post('/stations/:stationId/announcements', requireAdmin, controller.create);
module.exports = router;
