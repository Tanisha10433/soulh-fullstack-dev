const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/soulh_db';
    await mongoose.connect(connStr);
    console.log(`[Database] MongoDB Connected to: ${connStr.split('@')[1] || connStr}`);
  } catch (error) {
    console.error(`[Database] Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
