const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  organizationId: { type: String, ref: 'MasterSettings', required: true, index: true },
  name: { type: String, required: true, maxlength: 120, trim: true },
  email: { type: String, required: true, unique: true, maxlength: 254, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  passwordLogin: { type: Boolean, default: true },
  role: { type: String, enum: ['Admin', 'YardManager', 'Dispatcher'], default: 'Dispatcher' },
  active: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
