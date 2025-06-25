const dataManager = require('/app/data/dataManager');

// Datadog tracing imports for custom error logging
const { tracer, logWebSocketError, logCriticalSystemError } = require('../tracing');

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
    
    // For preventing duplicate log output
    this.lastLogMessage = '';
    this.lastLogTime = 0;
    this.duplicateLogCount = 0;
    
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
        
        const currentLogMessage = `\x1b[35m💥 MEGA BOMBER LIVE ${speedStatus}:\x1b[0m ` +
          `\x1b[32mProcessed: ${this.stats.processed.toLocaleString()}\x1b[0m | ` +
          `\x1b[33mQueue: ${this.messageQueue.length} ${queueStatus}\x1b[0m | ` +
          `\x1b[36mAvg(20): ${recentAvgRate.toFixed(0)}/sec\x1b[0m | ` +
          `\x1b[31mNOW: ${this.stats.instantRate}/sec ${speedStatus}\x1b[0m | ` +
          `\x1b[34mTotal: ${this.stats.queued.toLocaleString()}\x1b[0m`;
        
        // Only log if message is different from the last one
        if (currentLogMessage !== this.lastLogMessage) {
          // If we had duplicate messages, show how many were skipped
          if (this.duplicateLogCount > 0) {
            console.log(`\x1b[90m... (${this.duplicateLogCount} identical messages skipped)\x1b[0m`);
            this.duplicateLogCount = 0;
          }
          
          console.log(currentLogMessage);
          this.lastLogMessage = currentLogMessage;
          this.lastLogTime = Date.now();
        } else {
          this.duplicateLogCount++;
          
          // Show periodic update for long-running identical states (every 10 seconds)
          const timeSinceLastLog = Date.now() - this.lastLogTime;
          if (timeSinceLastLog > 10000) {
            console.log(`${currentLogMessage} \x1b[90m(stable for ${Math.floor(timeSinceLastLog/1000)}s)\x1b[0m`);
            this.lastLogTime = Date.now();
            this.duplicateLogCount = 0;
          }
        }
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
      // Add more detailed error logging for system failures
      console.error('🚨 BATCH PROCESSING FAILURE:');
      console.error('❌ Error Type:', error.name);
      console.error('❌ Error Message:', error.message);
      console.error('❌ Stack Trace:', error.stack);
      console.error('📊 Batch Size:', batch.length);
      console.error('📊 Queue Length:', this.messageQueue.length);
      
      // Log memory usage during error
      const memUsage = process.memoryUsage();
      console.error('📊 Memory Usage at Error:');
      console.error(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      console.error(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      
      // Log to Datadog APM as ERROR
      logWebSocketError(error, {
        'minitalk.operation': 'batch_processing',
        'minitalk.batch_size': batch.length,
        'minitalk.queue_length': this.messageQueue.length,
        'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
        'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024)
      });
      
      // If it's a memory-related error, log as CRITICAL
      if (error.message.includes('memory') || error.message.includes('heap') || 
          error.name === 'RangeError' || error.name === 'Error' && error.message.includes('Maximum')) {
        console.error('💀 CRITICAL: MEMORY-RELATED BATCH FAILURE!');
        
        // Log as CRITICAL system error to Datadog
        logCriticalSystemError(error, {
          'minitalk.operation': 'batch_processing',
          'minitalk.failure_type': 'memory_related',
          'minitalk.batch_size': batch.length,
          'minitalk.system_unstable': true
        });
      }
    } finally {
      this.processing = false;
    }
  }
}

// Global message processor instance
const messageProcessor = new MessageProcessor();

const handleSocketConnection = (socket, io) => {
  console.log(`User ${socket.userId} connected with socket ID: ${socket.id}`);

  // Add error handling for socket connection
  socket.on('error', (error) => {
    console.error('🚨 SOCKET CONNECTION ERROR:');
    console.error('❌ Error Type:', error.name);
    console.error('❌ Error Message:', error.message);
    console.error('❌ User:', socket.userId);
    console.error('❌ Socket ID:', socket.id);
    
    // Log memory usage during socket error
    const memUsage = process.memoryUsage();
    console.error('📊 Memory Usage at Socket Error:');
    console.error(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.error(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    
    // Log to Datadog APM as ERROR
    logWebSocketError(error, {
      'minitalk.operation': 'socket_connection',
      'minitalk.user': socket.userId,
      'minitalk.socket_id': socket.id,
      'minitalk.connection_error': true,
      'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
      'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024)
    });
  });

  // Add connection timeout handling
  socket.on('connect_error', (error) => {
    console.error('🚨 SOCKET CONNECT ERROR:');
    console.error('❌ Error:', error);
    console.error('❌ User:', socket.userId);
    
    // Log to Datadog APM as ERROR
    logWebSocketError(error, {
      'minitalk.operation': 'socket_connect',
      'minitalk.user': socket.userId,
      'minitalk.connect_error': true
    });
  });

  // Join user to their chat rooms
  joinUserRooms(socket);

  // Handle sending messages - ULTRA FAST QUEUE PROCESSING! 💥⚡
  socket.on('send_message', async (data) => {
    // Create custom span for message sending using Datadog tracer
    const span = tracer.startSpan('websocket.send_message');
    
    try {
      const { roomId, content } = data;
      const sender = socket.userId;

      // Add attributes to the span
      span.setTag('minitalk.operation', 'send_message');
      span.setTag('minitalk.user', sender);
      span.setTag('minitalk.room_id', roomId);
      span.setTag('minitalk.message.length', content ? content.length : 0);
      span.setTag('minitalk.transport', 'websocket');

      if (!roomId || !content) {
        const validationError = new Error('roomId and content are required');
        span.setTag('error', true);
        span.setTag('error.message', validationError.message);
        
        // Log validation error to Datadog
        logWebSocketError(validationError, {
          'minitalk.operation': 'send_message',
          'minitalk.user': sender,
          'minitalk.validation_failed': true
        });
        
        socket.emit('error', { message: 'roomId and content are required' });
        span.finish();
        return;
      }

      // Quick validation with cache (super fast!)
      const chatRoom = await dataManager.findChatRoomByRoomId(roomId);
      if (!chatRoom || !chatRoom.participants.includes(sender)) {
        const authError = new Error('You are not a member of this chat room');
        span.setTag('error', true);
        span.setTag('error.message', authError.message);
        
        // Log authorization error to Datadog
        logWebSocketError(authError, {
          'minitalk.operation': 'send_message',
          'minitalk.user': sender,
          'minitalk.room_id': roomId,
          'minitalk.authorization_failed': true
        });
        
        socket.emit('error', { message: 'You are not a member of this chat room' });
        span.finish();
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

      span.setTag('minitalk.message.queued', true);
      span.setTag('minitalk.queue.size', messageProcessor.messageQueue.length);
      span.finish();

      // Immediate acknowledgment (don't wait for processing)
      // This makes Python think the message was sent instantly! ⚡

    } catch (error) {
      console.error('Send message error:', error);
      // Add detailed error logging for WebSocket failures
      console.error('🚨 WEBSOCKET MESSAGE FAILURE:');
      console.error('❌ Error Type:', error.name);
      console.error('❌ Error Message:', error.message);
      console.error('❌ Stack Trace:', error.stack);
      console.error('📊 User:', socket.userId);
      console.error('📊 Socket ID:', socket.id);
      console.error('📊 Data:', JSON.stringify(data, null, 2));
      
      // Log memory usage during error
      const memUsage = process.memoryUsage();
      console.error('📊 Memory Usage at Error:');
      console.error(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      console.error(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      
      // Log to Datadog APM as ERROR
      logWebSocketError(error, {
        'minitalk.operation': 'send_message',
        'minitalk.user': socket.userId,
        'minitalk.socket_id': socket.id,
        'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
        'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024)
      });
      
      // Check if this is a system overload error
      if (error.message.includes('memory') || error.message.includes('heap') || 
          error.message.includes('timeout') || error.message.includes('ECONNRESET') ||
          error.name === 'RangeError' || error.name === 'TimeoutError') {
        console.error('💀 CRITICAL: SYSTEM OVERLOAD DETECTED IN WEBSOCKET!');
        
        // Log as CRITICAL system error to Datadog
        logCriticalSystemError(error, {
          'minitalk.operation': 'send_message',
          'minitalk.user': socket.userId,
          'minitalk.system_overload': true,
          'minitalk.failure_type': 'system_overload'
        });
      }
      
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.setTag('error.type', error.name);
      span.setTag('minitalk.system.memory_mb', Math.round(memUsage.heapUsed / 1024 / 1024));
      
      socket.emit('error', { message: 'Failed to send message' });
      span.finish();
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
