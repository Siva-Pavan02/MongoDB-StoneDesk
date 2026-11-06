const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const InvoicePaymentSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  organizationId: { type: String, ref: 'MasterSettings', required: true, index: true },
  dispatchId: { type: String, ref: 'Dispatch', required: true, index: true },
  amount: { type: Number, required: true },
  note: { type: String, maxlength: 255, default: null },
  createdByUserId: { type: String, ref: 'User', default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

InvoicePaymentSchema.index({ organizationId: 1, dispatchId: 1, createdAt: -1 });

module.exports = mongoose.models.InvoicePayment || mongoose.model('InvoicePayment', InvoicePaymentSchema);
