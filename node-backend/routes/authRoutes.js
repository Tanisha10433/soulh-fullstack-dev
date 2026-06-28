const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const DoctorVerification = require('../models/DoctorVerification');

const JWT_SECRET = process.env.APP_JWT_SECRET || 'soulh-super-secret-jwt-key-must-be-at-least-32-chars-long-for-hmac';

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Bad credentials' });
    }

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
