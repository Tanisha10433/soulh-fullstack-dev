const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ConnectionRequest = require('../models/ConnectionRequest');
const Message = require('../models/Message');
const Community = require('../models/Community');
const Post = require('../models/Post');

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
  },
  {
    name: 'Priya Sharma',
    email: 'priya@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'USER',
    illnessCondition: 'Anxiety and Depression',
    bio: 'Finding light in every small win. 3 years managing anxiety with grounding and breathing.',
    isPublicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
    isEmailVerified: true
  },
  {
    name: 'Aisha Khan',
    email: 'aisha@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'USER',
    illnessCondition: 'PCOS and Anxiety',
    bio: 'PCOS advocate, fitness enthusiast, and mental wellness seeker.',
    isPublicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
    isEmailVerified: true
  },
  {
    name: 'Dr. Arjun Sharma',
    email: 'dr.arjun@soulh.demo',
    passwordRaw: 'Demo@1234',
    role: 'DOCTOR',
    illnessCondition: 'Chronic Pain and Rheumatology',
    experience: 12,
    qualification: 'MBBS, MD (General Medicine)',
    hospital: 'Jaslok Hospital, Mumbai',
    bio: 'Dedicated to helping patients manage chronic invisible illnesses through a holistic approach.',
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
    const testHash = await bcrypt.hash('password', 10);

    // Auto-remove unwanted test/spam users
    await User.deleteMany({ name: { $regex: /jinga/i } });
    await User.deleteMany({ email: { $regex: /jinga/i } });

    // 1. Ensure permanent Test User exists
    let testUser = await User.findOne({ email: 'test@test.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@test.com',
        password: testHash,
        role: 'USER',
        illnessCondition: 'Anxiety',
        bio: 'Community explorer & chronic wellness advocate.',
        isPublicProfile: true,
        showInSearch: true,
        showIllness: true,
        allowDirectMessages: true,
        isEmailVerified: true
      });
      console.log('[Seed] Created permanent Test User (test@test.com)');
    }

    // 2. Seed all peers & demo doctors
    const userMap = {};
    for (const peer of peers) {
      let existing = await User.findOne({ email: peer.email });
      if (!existing) {
        existing = await User.create({
          ...peer,
          password: commonHash
        });
        console.log(`[Seed] Created peer: ${peer.name} (${peer.email})`);
      } else {
        existing.password = commonHash;
        existing.illnessCondition = peer.illnessCondition;
        existing.bio = peer.bio;
        existing.isPublicProfile = true;
        await existing.save();
      }
      userMap[peer.email] = existing;
    }

    // 3. Connect Test User with Priya & Aisha (with preloaded chats)
    const connectUsers = async (u1, u2, messages = []) => {
      if (!u1 || !u2) return;
      let existingConn = await ConnectionRequest.findOne({
        $or: [
          { sender: u1._id, receiver: u2._id },
          { sender: u2._id, receiver: u1._id }
        ]
      });

      if (!existingConn) {
        await ConnectionRequest.create({
          sender: u1._id,
          receiver: u2._id,
          status: 'ACCEPTED'
        });
        console.log(`[Seed] Connected ${u1.name} ↔ ${u2.name}`);

        for (const m of messages) {
          await Message.create({
            senderId: m.fromTest ? u1._id.toString() : u2._id.toString(),
            receiverId: m.fromTest ? u2._id.toString() : u1._id.toString(),
            content: m.text,
            status: 'read',
            sentAt: new Date(Date.now() - (m.agoMinutes || 10) * 60000)
          });
        }
      }
    };

        // Auto-connect with any registered user or Google user (like tanisha10433@gmail.com or other users)
    const allUsers = await User.find({ role: 'USER' });
    for (const u of allUsers) {
      if (userMap['priya@soulh.demo'] && u.email !== 'priya@soulh.demo') {
        await connectUsers(u, userMap['priya@soulh.demo'], [
          { text: 'Hey ' + (u.name ? u.name.split(' ')[0] : 'there') + '! I saw we both share similar mental health & chronic wellness journeys. Welcome to SoulH! 💙', fromTest: false, agoMinutes: 30 },
          { text: 'Hey Priya! Thank you so much, so glad to be connected! ✨', fromTest: true, agoMinutes: 20 }
        ]);
      }
      if (userMap['aarav@soulh.demo'] && u.email !== 'aarav@soulh.demo') {
        await connectUsers(u, userMap['aarav@soulh.demo'], [
          { text: 'Hi! I manage generalized anxiety with daily walks and mindfulness. Always here to chat if you need support! 🌿', fromTest: false, agoMinutes: 50 },
          { text: 'Hi Aarav! Appreciate you reaching out! 🙏', fromTest: true, agoMinutes: 40 }
        ]);
      }
    }

    if (userMap['priya@soulh.demo']) {
      await connectUsers(testUser, userMap['priya@soulh.demo'], [
        { text: 'Hey Priya! I saw your post about anxiety small wins. So inspiring!', fromTest: true, agoMinutes: 30 },
        { text: 'Aww thank you! It has been a journey. How are you feeling today?', fromTest: false, agoMinutes: 25 },
        { text: 'Taking it one day at a time! Doing box breathing daily.', fromTest: true, agoMinutes: 10 }
      ]);
    }

    if (userMap['aisha@soulh.demo']) {
      await connectUsers(testUser, userMap['aisha@soulh.demo'], [
        { text: 'Hi there! Welcome to SoulH. I saw we both manage anxiety.', fromTest: false, agoMinutes: 60 },
        { text: 'Hey Aisha! Yes, glad to connect with fellow warriors 💙', fromTest: true, agoMinutes: 45 }
      ]);
    }

    // Connect Priya ↔ Aisha
    if (userMap['priya@soulh.demo'] && userMap['aisha@soulh.demo']) {
      await connectUsers(userMap['priya@soulh.demo'], userMap['aisha@soulh.demo'], [
        { text: 'Hi Priya! How are your breathing exercises going?', fromTest: false, agoMinutes: 120 },
        { text: 'They are helping so much Aisha! Always here for you ✨', fromTest: true, agoMinutes: 110 }
      ]);
    }

    // 4. Default Community & Posts
    let community = await Community.findOne({ name: 'SoulH General' });
    if (!community) {
      community = await Community.create({
        name: 'SoulH General',
        description: 'A safe space for everyone living with a chronic illness.',
        illnessCondition: 'General',
        members: [testUser._id, ...Object.values(userMap).map(u => u._id)]
      });
      console.log('[Seed] Created SoulH General Community');
    }

    const postCount = await Post.countDocuments();
    if (postCount < 3 && userMap['priya@soulh.demo']) {
      await Post.create([
        {
          communityId: community._id.toString(),
          authorId: userMap['priya@soulh.demo']._id.toString(),
          content: 'Just had my first anxiety-free week in months. Small wins matter! 💪',
          illnessTag: 'ANXIETY'
        },
        {
          communityId: community._id.toString(),
          authorId: userMap['aisha@soulh.demo'] ? userMap['aisha@soulh.demo']._id.toString() : testUser._id.toString(),
          content: 'Does anyone else find that stress makes their symptoms 10x worse? Feeling overwhelmed.',
          illnessTag: 'PAIN'
        },
        {
          communityId: community._id.toString(),
          authorId: userMap['dr.arjun@soulh.demo'] ? userMap['dr.arjun@soulh.demo']._id.toString() : testUser._id.toString(),
          content: 'Gentle yoga and diaphragmatic breathing have been shown to calm the vagus nerve and reduce inflammation.',
          illnessTag: 'RESOURCES'
        }
      ]);
      console.log('[Seed] Sample community posts created');
    }

    console.log('[Seed] All peers, connections, and demo chat data verified in MongoDB.');
  } catch (err) {
    console.error('[Seed] Error seeding peers and demo connections:', err.message);
  }
};

module.exports = seedPeers;
