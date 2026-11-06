const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const LoadingListSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  organizationId: { type: String, ref: 'MasterSettings', required: true, index: true },
  loadingListNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  supervisor: { type: String, required: true },
  buyerDestination: { type: String, required: true },
  stoneType: { type: String, required: true },
  finish: { type: String, required: true },
  requirements: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['Draft', 'Loading', 'Completed'], default: 'Draft' }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

LoadingListSchema.index({ organizationId: 1, loadingListNumber: 1 }, { unique: true });
LoadingListSchema.index({ organizationId: 1, date: -1 });

module.exports = mongoose.models.LoadingList || mongoose.model('LoadingList', LoadingListSchema);
