const mongoose = require('mongoose');

const AvailabilitySlotSchema = new mongoose.Schema({
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// toJSON transform helper
AvailabilitySlotSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('AvailabilitySlot', AvailabilitySlotSchema);
