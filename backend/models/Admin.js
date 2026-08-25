const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    }
  },
  { timestamps: true }
);

adminSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(String(password || ''), this.passwordHash || '').catch(() => false);
};

adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('Admin', adminSchema);
