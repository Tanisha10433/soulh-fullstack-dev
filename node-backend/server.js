require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');
const setupWebSocket = require('./utils/websocket');
const seedPeers = require('./utils/seedPeers');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const postRoutes = require('./routes/postRoutes');
const communityRoutes = require('./routes/communityRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const fileRoutes = require('./routes/fileRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Connect to Database & Seed Default Peers
connectDB().then(() => {
  seedPeers();
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development/production fallback
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression()); // Gzip all responses — reduces payload size significantly
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', consultationRoutes); // Mounts /api/doctors/verified, /api/availability, /api/consultations, etc.

// Default API route
app.get('/', (req, res) => {
  res.json({ message: 'SoulH Node.js Backend API is running' });
});

// Keep-alive ping endpoint — prevents Render free tier cold starts
// Frontend pings this every 14 minutes to keep the server warm
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', ts: Date.now() });
});

// Setup WebSocket Server (SockJS + STOMP)
setupWebSocket(server);

// Start Server
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`[Server] Node.js Express server is listening on port ${PORT}`);
});
