require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function run() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }
  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters');
  }

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await Admin.findOneAndUpdate(
    { email },
    { email, passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin ready: ${admin.email}`);
  await mongoose.disconnect();
}

run().catch(error => {
  console.error('Admin seed failed:', error.message);
  process.exit(1);
});
