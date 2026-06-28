const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId: {
    type: String,
    required: true,
    index: true
  },
  reportedUserId: {
    type: String,
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  contextMessageId: {
    type: String
  },
  resolved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// toJSON transform helper
ReportSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Report', ReportSchema);
