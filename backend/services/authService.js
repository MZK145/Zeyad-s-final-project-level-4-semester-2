const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function signup({ name, email, password }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!name || !normalized || !password) throw Object.assign(new Error('All fields are required'), { statusCode: 400 });
  if (password.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
  if (await User.findOne({ email: normalized })) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  await User.create({ name: String(name).trim(), email: normalized, passwordHash: await bcrypt.hash(password, 10) });
  return { message: 'Account created' };
}

async function login({ email, password }) {
  const normalized = String(email || '').trim().toLowerCase();
  const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@metrosync.local').toLowerCase();
  if (normalized === adminEmail && password === String(process.env.ADMIN_PASSWORD || 'admin123')) {
    const token = jwt.sign({ id: `admin:${normalized}`, role: 'admin', email: normalized }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return { token, role: 'admin' };
  }
  const user = await User.findOne({ email: normalized });
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  const token = jwt.sign({ id: String(user._id), role: 'user', email: normalized }, process.env.JWT_SECRET, { expiresIn: '8h' });
  return { token, role: 'user' };
}
module.exports = { signup, login };
