const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const InvitationSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  tokenHash: { type: String, required: true, unique: true },
  organizationId: { type: String, ref: 'MasterSettings', required: true, index: true },
  issuedById: { type: String, ref: 'User', required: true },
  email: { type: String, required: true, maxlength: 254, lowercase: true, trim: true },
  role: { type: String, enum: ['Dispatcher', 'YardManager'], default: 'Dispatcher' },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

InvitationSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.models.Invitation || mongoose.model('Invitation', InvitationSchema);
