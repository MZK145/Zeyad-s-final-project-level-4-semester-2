const express = require('express');
const { body, validationResult } = require('express-validator');
const controller = require('../controllers/authController');
const router = express.Router();
const validate = (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg }); next(); };
router.post('/signup', [body('name').trim().isLength({ min: 2, max: 100 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 }), validate], controller.signup);
router.post('/login', controller.login);
module.exports = router;
