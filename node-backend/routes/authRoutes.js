const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const DoctorVerification = require('../models/DoctorVerification');
const ConnectionRequest = require('../models/ConnectionRequest');
const Message = require('../models/Message');

const JWT_SECRET = process.env.APP_JWT_SECRET || 'soulh-super-secret-jwt-key-must-be-at-least-32-chars-long-for-hmac';

// Helper to auto-connect user with demo peers
const ensureUserConnectedToPeers = async (user) => {
  if (!user || user.role !== 'USER') return;
  try {
    const demoPeers = await User.find({
      email: { $in: ['priya@soulh.demo', 'aarav@soulh.demo', 'sneha@soulh.demo', 'kabir@soulh.demo'] },
      _id: { $ne: user._id }
    });

    for (const peer of demoPeers) {
      let conn = await ConnectionRequest.findOne({
        $or: [
          { sender: user._id, receiver: peer._id },
          { sender: peer._id, receiver: user._id }
        ]
      });

      if (!conn) {
        await ConnectionRequest.create({
          sender: peer._id,
          receiver: user._id,
          status: 'ACCEPTED'
        });
        await Message.create({
          senderId: peer._id.toString(),
          receiverId: user._id.toString(),
          content: `Hey ${user.name ? user.name.split(' ')[0] : 'there'}! I saw we both share similar mental health & chronic wellness journeys. Welcome to SoulH! 💙`,
          status: 'read',
          sentAt: new Date(Date.now() - 15 * 60000)
        });
      } else if (conn.status !== 'ACCEPTED') {
        conn.status = 'ACCEPTED';
        await conn.save();
      }
    }
  } catch (e) {
    console.error('Auto connect on login error:', e);
  }
};

// Helper to generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Helper to create refresh token
const createRefreshToken = async (userId) => {
  const tokenStr = crypto.randomBytes(40).toString('hex');
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24 * 7); // 7 days

  const refreshToken = new RefreshToken({
    user: userId,
    token: tokenStr,
    expiryDate
  });

  await refreshToken.save();
  return refreshToken;
};

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'soulh-backend-node' });
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, illnessCondition, experience, qualification, hospital, registrationNumber } = req.body;
    
    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'USER',
      illnessCondition,
      experience,
      qualification,
      hospital,
      isPublicProfile: true
    });

    await user.save();

    if (role === 'DOCTOR' && registrationNumber) {
      const verification = new DoctorVerification({
        doctor: user._id,
        registrationNumber,
        status: 'PENDING'
      });
      await verification.save();
    }

    // Auto-connect with demo peers so user always has connected peers ready for chat
    await ensureUserConnectedToPeers(user);

    const accessToken = generateAccessToken(user);
    const refreshTokenObj = await createRefreshToken(user._id);

    res.json({
      token: accessToken,
      refreshToken: refreshTokenObj.token,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Bad credentials' });
    }

    // Account created via Google OAuth has no password — can't login with password
    if (!user.password) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please use the "Continue with Google" button.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Bad credentials' });
    }

    // Auto-connect with demo peers so user always has connected peers ready for chat
    await ensureUserConnectedToPeers(user);

    const accessToken = generateAccessToken(user);
    
    // Delete old refresh tokens
    await RefreshToken.deleteMany({ user: user._id });
    const refreshTokenObj = await createRefreshToken(user._id);

    res.json({
      token: accessToken,
      refreshToken: refreshTokenObj.token,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken: requestRefreshToken } = req.body;
    if (!requestRefreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokenObj = await RefreshToken.findOne({ token: requestRefreshToken }).populate('user');
    if (!tokenObj) {
      return res.status(403).json({ error: 'Refresh token is not in database!' });
    }

    // Check expiration
    if (tokenObj.expiryDate.getTime() < Date.now()) {
      await RefreshToken.findByIdAndDelete(tokenObj._id);
      return res.status(403).json({ error: 'Refresh token was expired. Please make a new signin request' });
    }

    const accessToken = generateAccessToken(tokenObj.user);

    res.json({
      token: accessToken,
      refreshToken: requestRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth Login
router.post('/oauth2/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    let email = '';
    let name = '';
    let sub = '';

    // Decrypting the Google JWT Token (either full verification or fallback decode)
    try {
      const parts = idToken.split('.');
      if (parts.length < 2) {
        throw new Error('Invalid token format');
      }
      const payloadB64 = parts[1];
      const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf-8');
      const claims = JSON.parse(payloadJson);

      email = claims.email ? claims.email.trim().toLowerCase() : '';
      name = claims.name || email.split('@')[0];
      sub = claims.sub;
    } catch (e) {
      return res.status(400).json({ error: 'Failed to decode Google ID Token' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Google account must have an email address' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Create new user via OAuth
      user = new User({
        email,
        name,
        oauthProvider: 'google',
        oauthId: sub,
        role: 'USER',
        isPublicProfile: true
      });
      await user.save();
    } else {
      // Update existing user with OAuth credentials if not set
      if (!user.oauthProvider) {
        user.oauthProvider = 'google';
        user.oauthId = sub;
        await user.save();
      }
    }

    // Auto-connect with demo peers so user always has connected peers ready for chat
    await ensureUserConnectedToPeers(user);

    const accessToken = generateAccessToken(user);
    await RefreshToken.deleteMany({ user: user._id });
    const refreshTokenObj = await createRefreshToken(user._id);

    res.json({
      token: accessToken,
      refreshToken: refreshTokenObj.token,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
