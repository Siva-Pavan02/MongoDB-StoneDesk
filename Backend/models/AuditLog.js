const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const AuditLogSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  action: { type: String, required: true, maxlength: 64 },
  organizationId: { type: String, ref: 'MasterSettings', default: null, index: true },
  userId: { type: String, ref: 'User', default: null, index: true },
  userEmail: { type: String, default: null },
  userRole: { type: String, default: null },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

AuditLogSchema.index({ organizationId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
