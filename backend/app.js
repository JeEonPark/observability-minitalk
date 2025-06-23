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
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/chatapp';
mongoose.connect(MONGO_URL)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MiniTalk Backend is running' });
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
