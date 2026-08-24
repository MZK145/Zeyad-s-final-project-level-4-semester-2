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

async function signup({ name, email, password }) {
  const cleanName = String(name || '').trim();
  const normalized = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanName || !normalized || !cleanPassword) fail('All fields are required', 400);
  if (cleanPassword.length < 6) fail('Password must be at least 6 characters', 400);
  if (await User.findOne({ email: normalized })) fail('Email already registered', 409);

  await User.create({
    name: cleanName,
    email: normalized,
    passwordHash: await bcrypt.hash(cleanPassword, 10)
  });

  return { message: 'Account created' };
}

async function login({ email, password }) {
  const normalized = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!normalized || !cleanPassword) fail('Email and password are required', 400);

  const secret = getJwtSecret();
  const admin = await Admin.findOne({ email: normalized }).lean();

  if (admin) {
    if (!admin.passwordHash) fail('Invalid credentials', 401);
    const isValid = await bcrypt.compare(cleanPassword, admin.passwordHash).catch(() => false);
    if (!isValid) fail('Invalid credentials', 401);

    const token = jwt.sign(
      { id: String(admin._id), role: 'admin', email: normalized },
      secret,
      { expiresIn: '8h' }
    );

    return { token, role: 'admin' };
  }

  const user = await User.findOne({ email: normalized });
  if (!user || !user.passwordHash) fail('Invalid credentials', 401);

  const isValid = await bcrypt.compare(cleanPassword, user.passwordHash).catch(() => false);
  if (!isValid) fail('Invalid credentials', 401);

  const token = jwt.sign(
    { id: String(user._id), role: 'user', email: normalized },
    secret,
    { expiresIn: '8h' }
  );

  return { token, role: 'user' };
}

module.exports = { signup, login };
