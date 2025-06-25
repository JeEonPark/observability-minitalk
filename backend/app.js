const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const { authenticateSocket } = require('./middleware/auth');
const { handleSocketConnection } = require('./ws/socketHandler');
const dataManager = require('/app/data/dataManager');

// FAST_HASH completely disabled for normal operation
process.env.FAST_HASH = 'false';
process.env.UV_THREADPOOL_SIZE = '128'; // Increase thread pool for better I/O performance
process.env.NODE_OPTIONS = '--max-old-space-size=8192'; // 8GB memory limit

// Increase system limits for massive concurrent connections
process.setMaxListeners(0); // Unlimited event listeners

console.log('🚀 FAST HASH MODE ACTIVATED for load testing!');
console.log('💥 INSANE PERFORMANCE MODE ACTIVATED!');
console.log(`🔥 Thread pool size: ${process.env.UV_THREADPOOL_SIZE}`);
console.log(`💪 Memory limit: 8GB`);

const app = express();
const server = http.createServer(app);

// INSANE PERFORMANCE Socket.IO configuration! 🚀💥
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"]
  },
  // MEGA PERFORMANCE optimizations for massive concurrent connections! 💪
  maxHttpBufferSize: 1e8, // 100MB buffer for huge messages
  pingTimeout: 60000, // 60 seconds ping timeout
  pingInterval: 25000, // 25 seconds ping interval
  upgradeTimeout: 30000, // 30 seconds upgrade timeout
  allowEIO3: true, // Support older clients
  transports: ['websocket', 'polling'], // Both transports for maximum compatibility
  // INSANE connection limits!
  maxConnections: 100000, // Support up to 100K concurrent connections!
  perMessageDeflate: false, // Disable compression for speed
  httpCompression: false, // Disable HTTP compression for speed
  // Ultra fast message processing
  allowRequest: (req, callback) => {
    // Always allow for maximum speed
    callback(null, true);
  }
});

// Middleware with MEGA PAYLOAD support for massive load testing! 🚀💥
app.use(cors());

// ULTRA LARGE payload limits for MEGA BATCH operations! 💪
app.use(express.json({ 
  limit: '100mb',  // 100MB limit for massive batch requests!
  parameterLimit: 100000,  // Support for massive parameter counts
  extended: true 
}));

app.use(express.urlencoded({ 
  limit: '100mb',  // 100MB limit for URL encoded data too
  parameterLimit: 100000,
  extended: true 
}));

// Initialize file storage (replaces MongoDB connection)
console.log('Initializing file-based storage...');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MiniTalk Backend is running' });
});

app.get('/ready', async (req, res) => {
  // Check if file storage is ready
  const isReady = await dataManager.isReady();
  if (isReady) {
    res.json({ status: 'OK', message: 'MiniTalk Backend is ready' });
  } else {
    res.status(503).json({ status: 'NOT_READY', message: 'File storage not ready' });
  }
});

// Socket.IO connection handling
io.use(authenticateSocket);
io.on('connection', (socket) => {
  handleSocketConnection(socket, io);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
