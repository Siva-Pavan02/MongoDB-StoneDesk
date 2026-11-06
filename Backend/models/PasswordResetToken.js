const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const PasswordResetTokenSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: String, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  used: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

module.exports = mongoose.models.PasswordResetToken || mongoose.model('PasswordResetToken', PasswordResetTokenSchema);
