const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  illnessCondition: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

// toJSON transform helper
CommunitySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Community', CommunitySchema);
