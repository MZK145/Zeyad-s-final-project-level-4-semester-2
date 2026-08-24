const express = require('express');
const { body, validationResult } = require('express-validator');
const controller = require('../controllers/authController');

const router = express.Router();
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  return next();
};

const authFields = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 6, max: 128 }).withMessage('Password must be 6–128 characters')
];

router.post('/signup', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  ...authFields,
  validate
], controller.signup);

router.post('/login', [
  ...authFields,
  validate
], controller.login);

module.exports = router;
