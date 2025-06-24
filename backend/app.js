const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const { authenticateSocket } = require('./middleware/auth');
const { handleSocketConnection } = require('./ws/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_URL = process.env.MONGO_URL;

let mongoUrl;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  const encodedUsername = encodeURIComponent(MONGODB_USERNAME);
  const encodedPassword = encodeURIComponent(MONGODB_PASSWORD);
  mongoUrl = `mongodb://${encodedUsername}:${encodedPassword}@mongodb:27017/minitalk?authSource=admin`;
} else if (MONGODB_URI) {
  mongoUrl = MONGODB_URI;
} else if (MONGO_URL) {
  mongoUrl = MONGO_URL;
} else {
  mongoUrl = 'mongodb://localhost:27017/chatapp';
}

console.log('Connecting to MongoDB with URL:', mongoUrl.replace(/\/\/.*@/, '//***:***@'));
mongoose.connect(mongoUrl)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MiniTalk Backend is running' });
});

app.get('/ready', (req, res) => {
  // Check if MongoDB is connected
  if (mongoose.connection.readyState === 1) {
    res.json({ status: 'OK', message: 'MiniTalk Backend is ready' });
  } else {
    res.status(503).json({ status: 'NOT_READY', message: 'Database not connected' });
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
