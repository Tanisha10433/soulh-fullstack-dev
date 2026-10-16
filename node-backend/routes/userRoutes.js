const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const PatientVerification = require('../models/PatientVerification');
const Report = require('../models/Report');
const authMiddleware = require('../middleware/authMiddleware');

// ── SPECIFIC / NAMED ROUTES (Must be before /:id) ──

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  res.json(req.user);
});

// Update profile fields
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { illnessCondition, publicProfile } = req.body;
    
    if (illnessCondition !== undefined) req.user.illnessCondition = illnessCondition;
    if (publicProfile !== undefined) req.user.isPublicProfile = publicProfile;

    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update privacy settings
router.patch('/me/privacy', authMiddleware, async (req, res) => {
  try {
    const settings = req.body;
    
    if (settings.showInSearch !== undefined) req.user.showInSearch = settings.showInSearch;
    if (settings.showIllness !== undefined) req.user.showIllness = settings.showIllness;
    if (settings.allowDirectMessages !== undefined) req.user.allowDirectMessages = settings.allowDirectMessages;
    if (settings.publicProfile !== undefined) req.user.isPublicProfile = settings.publicProfile;

    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete account (GDPR)
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register E2E public key
router.post('/me/public-key', authMiddleware, async (req, res) => {
  try {
    const { publicKey } = req.body;
    req.user.e2ePublicKey = publicKey;
    await req.user.save();
    res.json({ message: 'Public key registered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users by name, email, or condition
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const term = req.query.condition || req.query.q || '';
    if (!term.trim()) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const regex = new RegExp(term.trim(), 'i');
    const users = await User.find({
      _id: { $ne: req.user._id },
      role: 'USER',
      isPublicProfile: true,
      $or: [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        { illnessCondition: { $regex: regex } }
      ]
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get verified doctors
router.get('/doctors', authMiddleware, async (req, res) => {
  try {
    const doctors = await User.find({
      role: 'DOCTOR',
      isVerified: true
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Peer discovery
router.get('/discover', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    let query = {
      role: 'USER',
      _id: { $ne: me._id },
      isPublicProfile: true
    };

    if (me.illnessCondition && me.illnessCondition.trim()) {
      query.illnessCondition = me.illnessCondition;
    }

    let peers = await User.find(query);
    
    // Fallback: If no matches by condition (or if condition is empty), return all public users
    if (peers.length === 0) {
      delete query.illnessCondition;
      peers = await User.find(query);
    }

    res.json(peers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit patient verification proof
router.post('/submit-proof', authMiddleware, async (req, res) => {
  try {
    const { proofUrl } = req.body;

    const existing = await PatientVerification.findOne({
      patient: req.user._id,
      status: 'PENDING'
    });
    if (existing) {
      return res.status(400).json({ error: 'Validation already pending.' });
    }

    const pv = new PatientVerification({
      patient: req.user._id,
      proofUrl: proofUrl || 'https://example.com/dummy-medical-record.pdf',
      status: 'PENDING'
    });

    await pv.save();
    res.json(pv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PARAMETER-BASED ROUTES (/:id) ──

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const displayName = (user.name && user.name.trim())
      ? user.name
      : (user.email ? user.email.split('@')[0] : 'User');

    res.json({
      id: user._id.toString(),
      name: displayName,
      email: user.email,
      illnessCondition: user.illnessCondition,
      isVerified: user.isVerified,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get peer E2E public key
router.get('/:id/public-key', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.send(user.e2ePublicKey || '');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block user
router.post('/:id/block', authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!req.user.blockedUserIds.includes(targetId)) {
      req.user.blockedUserIds.push(targetId);
      await req.user.save();
    }
    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unblock user
router.post('/:id/unblock', authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.id;
    req.user.blockedUserIds = req.user.blockedUserIds.filter(id => id !== targetId);
    await req.user.save();
    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report user
router.post('/:id/report', authMiddleware, async (req, res) => {
  try {
    const { reason, description } = req.body;
    const report = new Report({
      reporterId: req.user._id.toString(),
      reportedUserId: req.params.id,
      reason: reason || 'OTHER',
      description
    });
    await report.save();
    res.json({ message: 'Report submitted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
