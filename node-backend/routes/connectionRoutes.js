const express = require('express');
const router = express.Router();
const ConnectionRequest = require('../models/ConnectionRequest');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');

// Helper: send notification
const createAndSendNotification = async (userId, message, type) => {
  try {
    const notif = new Notification({
      user: userId,
      message,
      type
    });
    await notif.save();
    
    // In Express, we can broadcast this over WS later if WS context is available.
    // For now we just save to DB so user sees it next fetch/polling/connection.
    if (global.broadcastNotification) {
      global.broadcastNotification(userId.toString(), notif);
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

// Helper: check consultation activity
const hasActiveConsultation = async (userId1, userId2) => {
  try {
    const activeStatuses = ['CONFIRMED', 'COMPLETED', 'PENDING', 'ACCEPTED'];
    const active = await Consultation.findOne({
      $or: [
        { patientId: userId1, doctorId: userId2, status: { $in: activeStatuses } },
        { patientId: userId2, doctorId: userId1, status: { $in: activeStatuses } }
      ]
    });
    return !!active;
  } catch (e) {
    return false;
  }
};

// Helper: areConnected (exported for messaging)
const areConnected = async (user1, user2) => {
  if (user1.role === 'USER' && user2.role === 'USER') {
    const request = await ConnectionRequest.findOne({
      $or: [
        { sender: user1._id, receiver: user2._id, status: 'ACCEPTED' },
        { sender: user2._id, receiver: user1._id, status: 'ACCEPTED' }
      ]
    });
    return !!request;
  }
  
  // If one of them is doctor, check consultations
  return await hasActiveConsultation(user1._id.toString(), user2._id.toString());
};

// Send request
router.post('/request/:targetUserId', authMiddleware, async (req, res) => {
  try {
    const sender = req.user;
    const receiverId = req.params.targetUserId;

    if (sender._id.toString() === receiverId) {
      return res.status(400).json({ error: 'Cannot connect with yourself.' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (sender.role !== 'USER' || receiver.role !== 'USER') {
      return res.status(400).json({ error: 'Peer connections are limited to normal users (members) only.' });
    }

    const existing = await ConnectionRequest.findOne({
      sender: sender._id,
      receiver: receiver._id
    });
    if (existing) {
      return res.status(400).json({ error: 'Request already sent.' });
    }

    const newRequest = new ConnectionRequest({
      sender: sender._id,
      receiver: receiver._id,
      status: 'PENDING'
    });

    await newRequest.save();

    await createAndSendNotification(
      receiver._id,
      `${sender.name || sender.email.split('@')[0]} sent you a connection request.`,
      'CONNECTION_REQUEST'
    );

    res.json(newRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending connection requests received by current user
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      receiver: req.user._id,
      status: 'PENDING'
    }).populate('sender');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all accepted connections for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      $or: [
        { sender: req.user._id, status: 'ACCEPTED' },
        { receiver: req.user._id, status: 'ACCEPTED' }
      ]
    }).populate('sender').populate('receiver');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Respond to request (accept/reject)
router.patch('/:requestId', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    const request = await ConnectionRequest.findById(req.params.requestId).populate('sender');
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to respond to this request' });
    }

    const isAccept = action && action.toUpperCase() === 'ACCEPT';
    request.status = isAccept ? 'ACCEPTED' : 'REJECTED';
    await request.save();

    if (isAccept) {
      await createAndSendNotification(
        request.sender._id,
        `${req.user.name || req.user.email.split('@')[0]} accepted your connection request!`,
        'REQUEST_ACCEPTED'
      );
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check status
router.get('/status/:targetUserId', authMiddleware, async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.targetUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const connected = await areConnected(req.user, otherUser);
    res.json({ connected });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.areConnected = areConnected;
