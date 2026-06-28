const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
    index: true
  },
  receiverId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String
  },
  voiceUrl: {
    type: String
  },
  mood: {
    type: String
  },
  status: {
    type: String,
    default: 'sent'
  },
  ciphertext: {
    type: String
  },
  nonce: {
    type: String
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  reactions: {
    type: Map,
    of: [String],
    default: new Map()
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  readAt: {
    type: Date
  }
});

// toJSON transform helper
MessageSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Message', MessageSchema);
