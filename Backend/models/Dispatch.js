const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const DispatchSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  organizationId: { type: String, ref: 'MasterSettings', required: true, index: true },
  dispatchSlipNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  supervisor: { type: String, required: true },
  partyName: { type: String, default: null },
  clientRequestId: { type: String, sparse: true, index: true },
  businessSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  logistics: { type: mongoose.Schema.Types.Mixed, required: true },
  inventory: { type: mongoose.Schema.Types.Mixed, required: true },
  summary: { type: mongoose.Schema.Types.Mixed, required: true },
  revisions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  status: { type: String, enum: ['Draft', 'Dispatched', 'Delivered'], default: 'Draft' }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

DispatchSchema.index({ organizationId: 1, dispatchSlipNumber: 1 }, { unique: true });
DispatchSchema.index({ organizationId: 1, date: -1 });
DispatchSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Dispatch || mongoose.model('Dispatch', DispatchSchema);
