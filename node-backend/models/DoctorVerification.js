const mongoose = require('mongoose');

const DoctorVerificationSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  registrationNumber: {
    type: String,
    required: true
  },
  councilName: {
    type: String
  },
  certificateUrl: {
    type: String
  },
  governmentIdUrl: {
    type: String
  },
  adminNotes: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// toJSON transform helper
DoctorVerificationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('DoctorVerification', DoctorVerificationSchema);
