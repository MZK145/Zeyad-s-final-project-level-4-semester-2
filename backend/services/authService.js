const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

function fail(message, statusCode) {
  throw Object.assign(new Error(message), { statusCode });
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret || secret === 'change-this-secret') fail('JWT_SECRET must be configured', 500);
  return secret;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function signup({ name, email, password }) {
  const cleanName = String(name || '').trim();
  const normalized = normalizeEmail(email);
  const cleanPassword = String(password || '');

  if (!cleanName || !normalized || !cleanPassword) fail('All fields are required', 400);
  if (cleanName.length < 2 || cleanName.length > 100) fail('Name must be 2–100 characters', 400);
  if (cleanPassword.length < 6 || cleanPassword.length > 128) fail('Password must be 6–128 characters', 400);

  const existing = await User.findOne({ email: normalized }).select('_id').lean();
  if (existing) fail('Email already registered', 409);

  await User.create({
    name: cleanName,
    email: normalized,
    passwordHash: await bcrypt.hash(cleanPassword, 12)
  });

  return { message: 'Account created' };
}

async function login({ email, password }) {
  const normalized = normalizeEmail(email);
  const cleanPassword = String(password || '');

  if (!normalized || !cleanPassword) fail('Email and password are required', 400);
  if (cleanPassword.length < 6 || cleanPassword.length > 128) fail('Password must be 6–128 characters long', 400);

  const secret = getJwtSecret();
  const admin = await Admin.findOne({ email: normalized }).select('+passwordHash');

  if (admin) {
    const isValid = await admin.comparePassword(cleanPassword);
    if (!isValid) fail('Invalid credentials', 401);
    return {
      token: jwt.sign(
        { id: String(admin._id), role: 'admin', email: normalized },
        secret,
        { expiresIn: '8h', issuer: 'metroflow-api', audience: 'metroflow-client' }
      ),
      role: 'admin'
    };
  }

  const user = await User.findOne({ email: normalized }).select('+passwordHash');
  if (!user || !(await user.comparePassword(cleanPassword))) fail('Invalid credentials', 401);

  return {
    token: jwt.sign(
      { id: String(user._id), role: 'user', email: normalized },
      secret,
      { expiresIn: '8h', issuer: 'metroflow-api', audience: 'metroflow-client' }
    ),
    role: 'user'
  };
}

module.exports = { signup, login };
