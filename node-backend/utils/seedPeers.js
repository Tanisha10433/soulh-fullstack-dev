const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ConnectionRequest = require('../models/ConnectionRequest');
const Message = require('../models/Message');
const Community = require('../models/Community');
const Post = require('../models/Post');
const Consultation = require('../models/Consultation');

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
    await Post.deleteMany({ content: { $regex: /ky haal hai/i } });

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

    // 1b. Ensure permanent Tanisha Sharma user exists (Google Demo user)
    let tanishaUser = await User.findOne({ email: 'tanisha10433@gmail.com' });
    if (!tanishaUser) {
      tanishaUser = await User.create({
        name: 'Tanisha Sharma',
        email: 'tanisha10433@gmail.com',
        password: testHash,
        role: 'USER',
        illnessCondition: 'Anxiety',
        bio: 'SoulH community member & peer wellness advocate.',
        isPublicProfile: true,
        showInSearch: true,
        showIllness: true,
        allowDirectMessages: true,
        isEmailVerified: true
      });
      console.log('[Seed] Created permanent Tanisha Sharma user (tanisha10433@gmail.com)');
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

    // 3. Interconnect demo peers & Test User (with preloaded chats)
    const connectUsers = async (u1, u2, messages = []) => {
      if (!u1 || !u2) return;
      if (u1._id.toString() === u2._id.toString()) return;
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
      } else if (existingConn.status !== 'ACCEPTED') {
        existingConn.status = 'ACCEPTED';
        await existingConn.save();
        console.log(`[Seed] Updated status to ACCEPTED: ${u1.name} ↔ ${u2.name}`);
      }

      const msgCount = await Message.countDocuments({
        $or: [
          { senderId: u1._id.toString(), receiverId: u2._id.toString() },
          { senderId: u2._id.toString(), receiverId: u1._id.toString() }
        ]
      });

      if (msgCount === 0 && messages && messages.length > 0) {
        for (const m of messages) {
          await Message.create({
            senderId: m.fromTest ? u1._id.toString() : u2._id.toString(),
            receiverId: m.fromTest ? u2._id.toString() : u1._id.toString(),
            content: m.text,
            voiceUrl: m.voiceUrl || undefined,
            status: 'read',
            sentAt: new Date(Date.now() - (m.agoMinutes || 10) * 60000)
          });
        }
      }
    };

    const priya = userMap['priya@soulh.demo'];
    const aarav = userMap['aarav@soulh.demo'];
    const sneha = userMap['sneha@soulh.demo'];
    const rohan = userMap['rohan@soulh.demo'];
    const ananya = userMap['ananya@soulh.demo'];
    const kabir = userMap['kabir@soulh.demo'];
    const aisha = userMap['aisha@soulh.demo'];

    // Cross-connect demo peers so every demo login has active chats
    if (priya && aarav) {
      await connectUsers(priya, aarav, [
        { text: 'Hi Aarav! How is your mindfulness routine going today?', fromTest: true, agoMinutes: 60 },
        { text: 'Hey Priya! Much better, took a 20 min morning walk. Thanks for checking in!', fromTest: false, agoMinutes: 45 }
      ]);
    }

    if (priya && sneha) {
      await connectUsers(priya, sneha, [
        { text: 'Hey Sneha! Loved your low-carb breakfast idea!', fromTest: true, agoMinutes: 90 },
        { text: 'So happy it helped! Mental wellness and good nutrition go hand in hand 🌱', fromTest: false, agoMinutes: 80 }
      ]);
    }

    if (priya && aisha) {
      await connectUsers(priya, aisha, [
        { text: 'Hi Priya! How are your breathing exercises going?', fromTest: false, agoMinutes: 120 },
        { text: 'They are helping so much Aisha! Always here for you ✨', fromTest: true, agoMinutes: 110 }
      ]);
    }

    if (aarav && kabir) {
      await connectUsers(aarav, kabir, [
        { text: 'Hey Kabir, how are the migraine symptoms this week?', fromTest: true, agoMinutes: 50 },
        { text: 'Reducing screen time has made a noticeable difference! Appreciate the support brother.', fromTest: false, agoMinutes: 30 }
      ]);
    }

    if (sneha && rohan) {
      await connectUsers(sneha, rohan, [
        { text: 'Hi Rohan! How is the creative journaling going?', fromTest: true, agoMinutes: 70 },
        { text: 'Writing really helps organize my thoughts when things feel overwhelming ✍️', fromTest: false, agoMinutes: 40 }
      ]);
    }

    if (ananya && priya) {
      await connectUsers(ananya, priya, [
        { text: 'Hey Priya! Trying strength training today for PCOS management 💪', fromTest: true, agoMinutes: 40 },
        { text: 'You got this Ananya! Consistency is key ✨', fromTest: false, agoMinutes: 25 }
      ]);
    }

    // Connect Test User to peers
    if (testUser && priya) {
      await connectUsers(testUser, priya, [
        { text: 'Hey Priya! I saw your post about anxiety small wins. So inspiring!', fromTest: true, agoMinutes: 30 },
        { text: 'Aww thank you! It has been a journey. How are you feeling today?', fromTest: false, agoMinutes: 25 },
        { text: 'Taking it one day at a time! Doing box breathing daily.', fromTest: true, agoMinutes: 10 }
      ]);
    }

    if (testUser && aarav) {
      await connectUsers(testUser, aarav, [
        { text: 'Hi! I manage generalized anxiety with daily walks and mindfulness. Always here to chat if you need support! 🌿', fromTest: false, agoMinutes: 50 },
        { text: 'Hi Aarav! Appreciate you reaching out! 🙏', fromTest: true, agoMinutes: 40 }
      ]);
    }

    if (testUser && sneha) {
      await connectUsers(testUser, sneha, [
        { text: 'Hi Sneha! Glad to connect with you.', fromTest: true, agoMinutes: 35 },
        { text: 'Welcome to SoulH! Hope you are having a peaceful day ☀️', fromTest: false, agoMinutes: 20 }
      ]);
    }

    if (testUser && aisha) {
      await connectUsers(testUser, aisha, [
        { text: 'Hi there! Welcome to SoulH. I saw we both manage anxiety.', fromTest: false, agoMinutes: 60 },
        { text: 'Hey Aisha! Yes, glad to connect with fellow warriors 💙', fromTest: true, agoMinutes: 45 }
      ]);
    }

    // Connect Tanisha Sharma ↔ Priya Sharma
    if (tanishaUser && priya) {
      await connectUsers(tanishaUser, priya, [
        { text: 'Hey Priya! I saw your post about small wins with anxiety. So inspiring! ✨', fromTest: true, agoMinutes: 30 },
        { text: 'Hi Tanisha! So glad to connect with you. How are you feeling today? 💙', fromTest: false, agoMinutes: 20 },
        { text: 'Taking it one day at a time! Doing box breathing daily.', fromTest: true, agoMinutes: 10 }
      ]);
    }

    if (tanishaUser && aarav) {
      await connectUsers(tanishaUser, aarav, [
        { text: 'Hi Tanisha! I manage generalized anxiety with daily walks and mindfulness. Always here to chat if you need support! 🌿', fromTest: false, agoMinutes: 50 },
        { text: 'Hi Aarav! Appreciate you reaching out! 🙏', fromTest: true, agoMinutes: 40 }
      ]);
    }

    // Auto-connect with ANY registered user or Google user
    const allUsers = await User.find({ role: 'USER' });
    for (const u of allUsers) {
      if (priya && u.email !== priya.email) {
        await connectUsers(u, priya, [
          { text: 'Hey ' + (u.name ? u.name.split(' ')[0] : 'there') + '! I saw we both share similar mental health & chronic wellness journeys. Welcome to SoulH! 💙', fromTest: false, agoMinutes: 30 },
          { text: 'Hey Priya! Thank you so much, so glad to be connected! ✨', fromTest: true, agoMinutes: 20 }
        ]);
      }
      if (aarav && u.email !== aarav.email) {
        await connectUsers(u, aarav, [
          { text: 'Hi! I manage generalized anxiety with daily walks and mindfulness. Always here to chat if you need support! 🌿', fromTest: false, agoMinutes: 50 },
          { text: 'Hi Aarav! Appreciate you reaching out! 🙏', fromTest: true, agoMinutes: 40 }
        ]);
      }
      if (sneha && u.email !== sneha.email) {
        await connectUsers(u, sneha, [
          { text: 'Hello! Wishing you health and peace on your wellness journey 🌿', fromTest: false, agoMinutes: 40 },
          { text: 'Thank you Sneha! 😊', fromTest: true, agoMinutes: 30 }
        ]);
      }
    }

    // Connect Dr. Arjun Sharma with a confirmed consultation for demo
    const drArjun = userMap['dr.arjun@soulh.demo'];
    if (drArjun && testUser) {
      const existingConsultation = await Consultation.findOne({ doctorId: drArjun._id.toString() });
      if (!existingConsultation) {
        await Consultation.create({
          patientId: testUser._id.toString(),
          doctorId: drArjun._id.toString(),
          slotId: 'demo-slot-1',
          condition: 'Chronic Pain & Fatigue Consultation',
          status: 'CONFIRMED',
          scheduledAt: new Date(Date.now() + 86400000)
        });
        console.log('[Seed] Created demo consultation for Dr. Arjun Sharma');
      }
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
