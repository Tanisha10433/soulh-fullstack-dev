const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized - Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.APP_JWT_SECRET || 'soulh-super-secret-jwt-key-must-be-at-least-32-chars-long-for-hmac');
    
    // Decoded payload contains subject (which is email or userId)
    // Let's check decoded.sub (Spring Boot uses email/username as sub usually) or decoded.id
    const identifier = decoded.sub || decoded.email || decoded.id;
    
    if (!identifier) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token payload' });
    }

    // Try finding by email or ID
    let user = await User.findOne({ email: identifier });
    if (!user && mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    }

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ message: 'Unauthorized - Invalid or expired token' });
  }
};

module.exports = authMiddleware;
