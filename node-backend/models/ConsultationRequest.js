const mongoose = require('mongoose');

const ConsultationRequestSchema = new mongoose.Schema({
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
  condition: {
    type: String
  },
  status: {
    type: String,
    default: 'PENDING'
  },
  scheduledTime: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// toJSON transform helper
ConsultationRequestSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ConsultationRequest', ConsultationRequestSchema);
