const mongoose = require('mongoose');

const PatientVerificationSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  proofUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// toJSON transform helper
PatientVerificationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('PatientVerification', PatientVerificationSchema);
