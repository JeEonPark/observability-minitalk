const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const { authenticateSocket } = require('./middleware/auth');
const { handleSocketConnection } = require('./ws/socketHandler');
const dataManager = require('./data/dataManager');

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
