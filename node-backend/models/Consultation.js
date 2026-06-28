const mongoose = require('mongoose');

const ConsultationSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  slotId: {
    type: String,
    required: true
  },
  condition: {
    type: String
  },
  status: {
    type: String,
    default: 'PENDING'
  },
  meetingUrl: {
    type: String
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  amountPaid: {
    type: Number
  },
  doctorSummary: {
    type: String
  },
  scheduledAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// toJSON transform helper
ConsultationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Consultation', ConsultationSchema);
