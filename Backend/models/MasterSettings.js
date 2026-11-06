const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const MasterSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  organizationId: { type: String, required: true, unique: true },
  businessName: { type: String, maxlength: 120, default: '' },
  address: { type: String, maxlength: 300, default: '' },
  phone: { type: String, maxlength: 30, default: '' },
  bankDetails: { type: String, maxlength: 300, default: '' },
  gstNumber: { type: String, maxlength: 15, default: '' },
  tradeLicense: { type: String, maxlength: 80, default: '' },
  logoPath: { type: String, default: null },
  savedTrucks: { type: [String], default: [] },
  savedDestinations: { type: [String], default: [] },
  stoneRates: { type: [mongoose.Schema.Types.Mixed], default: [] },
  defaultRoyaltyFee: { type: Number, default: 0 },
  version: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; return ret; } }
});

module.exports = mongoose.models.MasterSettings || mongoose.model('MasterSettings', MasterSettingsSchema);
