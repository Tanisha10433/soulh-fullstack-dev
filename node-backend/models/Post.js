const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  communityId: {
    type: String,
    required: true,
    index: true
  },
  authorId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  illnessTag: {
    type: String
  },
  imageUrl: {
    type: String
  },
  fileUrl: {
    type: String
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  likeUserIds: {
    type: [String],
    default: []
  }
});

// toJSON transform helper
PostSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Post', PostSchema);
