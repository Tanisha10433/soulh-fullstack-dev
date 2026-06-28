const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String
  },
  name: {
    type: String
  },
  role: {
    type: String,
    enum: ['USER', 'DOCTOR', 'ADMIN'],
    default: 'USER'
  },
  // Profile fields
  illnessCondition: {
    type: String
  },
  experience: {
    type: Number
  },
  qualification: {
    type: String
  },
  hospital: {
    type: String
  },
  bio: {
    type: String
  },
  expertiseAreas: {
    type: [String],
    default: []
  },
  awards: {
    type: [String],
    default: []
  },
  publications: {
    type: [String],
    default: []
  },
  isPublicProfile: {
    type: Boolean,
    default: true
  },
  showInSearch: {
    type: Boolean,
    default: true
  },
  showIllness: {
    type: Boolean,
    default: true
  },
  allowDirectMessages: {
    type: Boolean,
    default: true
  },
  // OAuth / OIDC
  oauthProvider: {
    type: String
  },
  oauthId: {
    type: String
  },
  // E2E Encryption key
  e2ePublicKey: {
    type: String
  },
  // Verification badges
  isVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  blockedUserIds: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Remove password when converting to JSON
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    // Map _id to id to match backend JSON response behavior
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
