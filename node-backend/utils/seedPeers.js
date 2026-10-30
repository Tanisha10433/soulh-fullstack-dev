const bcrypt = require('bcryptjs');
const User = require('../models/User');

const peers = [
  {
    name: 'Aarav Patel',
    email: 'aarav@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'USER',
    illnessCondition: 'Anxiety',
    bio: 'Software engineer managing generalized anxiety. Practicing mindfulness, daily walks, and cognitive grounding.',
    isPublicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
    isEmailVerified: true
  },
  {
    name: 'Sneha Kulkarni',
    email: 'sneha@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'USER',
    illnessCondition: 'Diabetes',
    bio: 'Type 1 diabetic for 6 years. Passionate about nutrition, low-carb recipes, and mental wellness.',
    isPublicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
    isEmailVerified: true
  },
  {
    name: 'Rohan Verma',
    email: 'rohan@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'USER',
    illnessCondition: 'Depression',
    bio: 'Writer and artist finding light through creative journaling. Always here to listen and share.',
    isPublicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
    isEmailVerified: true
  },
  {
    name: 'Ananya Iyer',
    email: 'ananya@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'USER',
    illnessCondition: 'PCOS',
    bio: 'Managing PCOS through holistic lifestyle adjustments and strength training. Happy to connect with peers.',
    isPublicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
    isEmailVerified: true
  },
  {
    name: 'Kabir Malhotra',
    email: 'kabir@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'USER',
    illnessCondition: 'Migraine',
    bio: 'Chronic migraine survivor. Sharing tips on screen fatigue, hydration routines, and stress management.',
    isPublicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
    isEmailVerified: true
  }
];

const seedPeers = async () => {
  try {
    const commonHash = await bcrypt.hash('Demo@1234', 10);

    for (const peer of peers) {
      const existing = await User.findOne({ email: peer.email });
      if (!existing) {
        await User.create({
          ...peer,
          password: commonHash
        });
        console.log(`[Seed] Created peer: ${peer.name} (${peer.email})`);
      } else {
        // Ensure password and role are in sync
        existing.password = commonHash;
        existing.illnessCondition = peer.illnessCondition;
        existing.bio = peer.bio;
        existing.isPublicProfile = true;
        await existing.save();
      }
    }
    console.log('[Seed] 5 hardcoded peers verified in database.');
  } catch (err) {
    console.error('[Seed] Error seeding peers:', err.message);
  }
};

module.exports = seedPeers;
