const express = require('express');
const { body, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/requireAdmin');
const controller = require('../controllers/announcementController');

const router = express.Router();
const validateMessage = [
  body('message').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Announcement must be 1–500 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    return next();
  }
];

router.get('/stations/:stationId/announcements', controller.list);
router.post('/stations/:stationId/announcements', requireAdmin, validateMessage, controller.create);

module.exports = router;
