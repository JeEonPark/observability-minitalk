const dataManager = require('../data/dataManager');

// Message processing optimization for MEGA BOMBING! 💥
class MessageProcessor {
  constructor() {
    this.messageQueue = [];
    this.processing = false;
    this.batchSize = 100000; // Process 500 messages at once for MEGA SPEED! 💥
    this.flushInterval = 20; // Flush every 20ms for ULTRA SPEED! ⚡
    this.stats = {
      processed: 0,
      queued: 0,
      startTime: Date.now(),
      lastProcessed: 0,
      instantRate: 0
    };
    
    // Moving average for recent 20 logs
    this.recentRates = [];
    this.maxRecentRates = 20;
    
    this.startBatchProcessor();
  }
  
  // Add message to queue for batch processing
  queueMessage(messageData) {
    this.messageQueue.push(messageData);
    this.stats.queued++;
    
    // Auto-flush if queue is getting large
    if (this.messageQueue.length >= this.batchSize) {
      this.flushMessages();
    }
  }
  
  // Calculate moving average of recent rates
  updateMovingAverage(currentRate) {
    this.recentRates.push(currentRate);
    
    // Keep only the most recent 20 rates
    if (this.recentRates.length > this.maxRecentRates) {
      this.recentRates.shift();
    }
    
    // Calculate average of recent rates
    const sum = this.recentRates.reduce((acc, rate) => acc + rate, 0);
    return this.recentRates.length > 0 ? sum / this.recentRates.length : 0;
  }
  
  // Start the batch processor
  startBatchProcessor() {
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.flushMessages();
      }
    }, this.flushInterval);
    
    // ULTRA FREQUENT STATS - 10 times per second! 💥⚡
    setInterval(() => {
      if (this.stats.processed > 0 || this.messageQueue.length > 0) {
        // Calculate instant rate (messages processed in last 200ms)
        const instantProcessed = this.stats.processed - this.stats.lastProcessed;
        this.stats.instantRate = instantProcessed * 5; // Convert to per-second rate (200ms * 5 = 1000ms)
        this.stats.lastProcessed = this.stats.processed;
        
        // Update moving average with current instant rate
        const recentAvgRate = this.updateMovingAverage(this.stats.instantRate);
        
        // Show ULTRA DETAILED MEGA STATS! 🔥💥⚡
        const queueStatus = this.messageQueue.length > 1000 ? '🔥' : 
                           this.messageQueue.length > 500 ? '⚡' : 
                           this.messageQueue.length > 100 ? '🚀' : '✅';
        
        const speedStatus = this.stats.instantRate > 10000 ? '🏆👑' :
                           this.stats.instantRate > 5000 ? '🏆' :
                           this.stats.instantRate > 1000 ? '🔥' :
                           this.stats.instantRate > 500 ? '⚡' : '🚀';
        
        console.log(`\x1b[35m💥 MEGA BOMBER LIVE ${speedStatus}:\x1b[0m ` +
          `\x1b[32mProcessed: ${this.stats.processed.toLocaleString()}\x1b[0m | ` +
          `\x1b[33mQueue: ${this.messageQueue.length} ${queueStatus}\x1b[0m | ` +
          `\x1b[36mAvg(20): ${recentAvgRate.toFixed(0)}/sec\x1b[0m | ` +
          `\x1b[31mNOW: ${this.stats.instantRate}/sec ${speedStatus}\x1b[0m | ` +
          `\x1b[34mTotal: ${this.stats.queued.toLocaleString()}\x1b[0m`);
      }
    }, 200); // Every 200ms = 5 times per second!
  }
  
  // Process messages in batches for ULTRA SPEED! ⚡
  async flushMessages() {
    if (this.processing || this.messageQueue.length === 0) return;
    
    this.processing = true;
    const batch = this.messageQueue.splice(0, this.batchSize);
    
         try {
       // ULTRA FAST BATCH PROCESSING! 💥⚡
       // Save all messages in one batch operation
       const savedMessages = await dataManager.createMessagesBatch(batch.map(msgData => ({
         roomId: msgData.roomId,
         sender: msgData.sender,
         content: msgData.content,
         timestamp: msgData.timestamp
       })));
       
       // Broadcast all messages immediately after batch save
       batch.forEach((msgData, index) => {
         const savedMessage = savedMessages[index];
         
         msgData.io.to(msgData.roomId).emit('message', {
           type: 'message',
           roomId: msgData.roomId,
           sender: msgData.sender,
           content: msgData.content,
           timestamp: savedMessage.timestamp
         });
         
         this.stats.processed++;
       });
       
     } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.processing = false;
    }
  }
}

// Global message processor instance
const messageProcessor = new MessageProcessor();

const handleSocketConnection = (socket, io) => {
  console.log(`User ${socket.userId} connected with socket ID: ${socket.id}`);

  // Join user to their chat rooms
  joinUserRooms(socket);

  // Handle sending messages - ULTRA FAST QUEUE PROCESSING! 💥⚡
  socket.on('send_message', async (data) => {
    try {
      const { roomId, content } = data;
      const sender = socket.userId;

      if (!roomId || !content) {
        socket.emit('error', { message: 'roomId and content are required' });
        return;
      }

      // Quick validation with cache (super fast!)
      const chatRoom = await dataManager.findChatRoomByRoomId(roomId);
      if (!chatRoom || !chatRoom.participants.includes(sender)) {
        socket.emit('error', { message: 'You are not a member of this chat room' });
        return;
      }

      // Queue message for ULTRA FAST batch processing! 🚀
      messageProcessor.queueMessage({
        roomId,
        sender,
        content,
        timestamp: new Date().toISOString(),
        io: io // Pass io for broadcasting
      });

      // Immediate acknowledgment (don't wait for processing)
      // This makes Python think the message was sent instantly! ⚡
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle joining specific room
  socket.on('join_room', async (data) => {
    try {
      const { roomId } = data;
      const username = socket.userId;

      // Verify user is participant of the room
      const chatRoom = await dataManager.findChatRoomByRoomId(roomId);
      if (!chatRoom || !chatRoom.participants.includes(username)) {
        socket.emit('error', { message: 'You are not a member of this chat room' });
        return;
      }

      socket.join(roomId);
      socket.emit('joined_room', { roomId });
      console.log(`User ${username} joined room ${roomId}`);

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle leaving room
  socket.on('leave_room', (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    socket.emit('left_room', { roomId });
    console.log(`User ${socket.userId} left room ${roomId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
};

// Join user to all their chat rooms on connection
const joinUserRooms = async (socket) => {
  try {
    const username = socket.userId;
    const chatRooms = await dataManager.findChatRoomsByParticipant(username);

    chatRooms.forEach(room => {
      socket.join(room.roomId);
    });

    console.log(`User ${username} joined ${chatRooms.length} rooms`);
  } catch (error) {
    console.error('Join user rooms error:', error);
  }
};

module.exports = {
  handleSocketConnection
}; 
