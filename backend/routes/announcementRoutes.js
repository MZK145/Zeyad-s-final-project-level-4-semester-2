const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const requireAdmin = require('../middleware/requireAdmin');
const controller = require('../controllers/announcementController');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  return next();
};

const stationIdParam = param('stationId')
  .custom(value => mongoose.isValidObjectId(value))
  .withMessage('Invalid station id');

router.get('/stations/:stationId/announcements', [
  stationIdParam,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('filter').optional().isString().isLength({ max: 100 }).withMessage('Filter is too long'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search is too long'),
  validate
], controller.list);

router.post('/stations/:stationId/announcements', [
  requireAdmin,
  stationIdParam,
  body('message').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Announcement must be 1–500 characters'),
  validate
], controller.create);

module.exports = router;
