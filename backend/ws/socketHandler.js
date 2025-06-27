const dataManager = require('/app/data/dataManager');

// OpenTelemetry imports for custom tracing
const { trace, context } = require('@opentelemetry/api');
const tracer = trace.getTracer('minitalk-backend', '1.0.1');

// Helper function to create child spans with proper context
function createChildSpan(parentSpan, name, attributes = {}) {
  return tracer.startSpan(name, {
    parent: parentSpan,
    attributes: {
      'minitalk.span.type': 'child',
      'minitalk.component': 'websocket',
      ...attributes
    }
  });
}

// Helper function for database operations with tracing
async function tracedDatabaseOperation(parentSpan, operationName, operation) {
  const dbSpan = createChildSpan(parentSpan, `database.${operationName}`, {
    'minitalk.database.operation': operationName,
    'minitalk.component': 'database'
  });
  
  try {
    const result = await operation();
    dbSpan.setStatus({ code: 1 }); // OK
    dbSpan.setAttributes({
      'minitalk.database.success': true
    });
    return result;
  } catch (error) {
    dbSpan.setStatus({ code: 2, message: error.message }); // ERROR
    dbSpan.setAttributes({
      'minitalk.database.error': true,
      'minitalk.error.message': error.message
    });
    throw error;
  } finally {
    dbSpan.end();
  }
}

// Helper function for logging errors with tracing
function logWebSocketError(error, attributes = {}) {
  const errorSpan = tracer.startSpan('websocket.error', {
    attributes: {
      'minitalk.component': 'websocket',
      'minitalk.error.type': error.name || 'UnknownError',
      'minitalk.error.message': error.message,
      ...attributes
    }
  });
  
  errorSpan.setStatus({ code: 2, message: error.message });
  errorSpan.end();
}

// Helper function for critical system errors
function logCriticalSystemError(error, attributes = {}) {
  const criticalSpan = tracer.startSpan('system.critical_error', {
    attributes: {
      'minitalk.component': 'system',
      'minitalk.error.type': error.name || 'UnknownError',
      'minitalk.error.message': error.message,
      'minitalk.severity': 'critical',
      ...attributes
    }
  });
  
  criticalSpan.setStatus({ code: 2, message: error.message });
  criticalSpan.end();
}

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
    
    this.startBatchProcessor();
  }
  
  // Add message to queue for batch processing with tracing
  queueMessage(messageData, parentSpan = null) {
    // Create span for message queuing
    const queueSpan = parentSpan ? 
      createChildSpan(parentSpan, 'message_processor.queue_message', {
        'minitalk.message.queued': true,
        'minitalk.queue.size_before': this.messageQueue.length
      }) : 
      tracer.startSpan('message_processor.queue_message', {
        attributes: {
          'minitalk.component': 'message_processor',
          'minitalk.message.queued': true,
          'minitalk.queue.size_before': this.messageQueue.length
        }
      });
    
    try {
      this.messageQueue.push({
        ...messageData,
        parentSpan: parentSpan // Store parent span for later use
      });
    this.stats.queued++;
      
      queueSpan.setAttributes({
        'minitalk.queue.size_after': this.messageQueue.length,
        'minitalk.stats.total_queued': this.stats.queued
      });
      queueSpan.setStatus({ code: 1 }); // OK
    
    // Auto-flush if queue is getting large
    if (this.messageQueue.length >= this.batchSize) {
      this.flushMessages();
      }
    } finally {
      queueSpan.end();
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
          console.log(currentLogMessage);
          this.lastLogMessage = currentLogMessage;
        }
      }
    }, 200); // Every 200ms = 5 times per second!
  }
  
  // Process messages in batches for ULTRA SPEED! ⚡ with tracing
  async flushMessages() {
    if (this.processing || this.messageQueue.length === 0) return;
    
    // Create root span for batch processing
    const batchSpan = tracer.startSpan('message_processor.flush_batch', {
      attributes: {
        'minitalk.component': 'message_processor',
        'minitalk.batch.size': Math.min(this.messageQueue.length, this.batchSize),
        'minitalk.queue.size_before': this.messageQueue.length
      }
    });
    
    this.processing = true;
    const batch = this.messageQueue.splice(0, this.batchSize);
    
         try {
      batchSpan.setAttributes({
        'minitalk.batch.actual_size': batch.length,
        'minitalk.queue.size_after': this.messageQueue.length
      });

      // Child span 1: Database batch operation
      const savedMessages = await tracedDatabaseOperation(batchSpan, 'create_messages_batch', async () => {
        return await dataManager.createMessagesBatch(batch.map(msgData => ({
         roomId: msgData.roomId,
         sender: msgData.sender,
         content: msgData.content,
         timestamp: msgData.timestamp
       })));
      });
       
      // Child span 2: Broadcast messages
      const broadcastSpan = createChildSpan(batchSpan, 'websocket.broadcast_batch', {
        'minitalk.broadcast.message_count': batch.length
      });
      
      try {
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
        
        broadcastSpan.setAttributes({
          'minitalk.broadcast.success': true,
          'minitalk.stats.total_processed': this.stats.processed
        });
        broadcastSpan.setStatus({ code: 1 }); // OK
      } finally {
        broadcastSpan.end();
      }
      
      batchSpan.setAttributes({
        'minitalk.batch.success': true,
        'minitalk.stats.total_processed': this.stats.processed
      });
      batchSpan.setStatus({ code: 1 }); // OK
       
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
      
      // Child span for error handling
      const errorSpan = createChildSpan(batchSpan, 'error.handle_batch_processing', {
        'minitalk.error.type': error.name || 'UnknownError',
        'minitalk.batch_size': batch.length,
        'minitalk.queue_length': this.messageQueue.length,
        'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
        'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024)
      });
      
      try {
        errorSpan.setAttributes({
          'minitalk.error.message': error.message,
          'minitalk.error.stack': error.stack
        });
        errorSpan.setStatus({ code: 2, message: error.message }); // ERROR
      } finally {
        errorSpan.end();
      }
      
      // If it's a memory-related error, log as CRITICAL
      if (error.message.includes('memory') || error.message.includes('heap') || 
          error.name === 'RangeError' || error.name === 'Error' && error.message.includes('Maximum')) {
        console.error('💀 CRITICAL: MEMORY-RELATED BATCH FAILURE!');
        
        // Log as CRITICAL system error to OpenTelemetry
        logCriticalSystemError(error, {
          'minitalk.operation': 'batch_processing',
          'minitalk.failure_type': 'memory_related',
          'minitalk.batch_size': batch.length,
          'minitalk.system_unstable': true
        });
      }
      
      batchSpan.setStatus({ code: 2, message: error.message }); // ERROR
      batchSpan.setAttributes({
        'minitalk.batch.error': true,
        'minitalk.error.message': error.message
      });
    } finally {
      this.processing = false;
      batchSpan.end();
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
    
    // Log to OpenTelemetry as ERROR
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
    
    // Log to OpenTelemetry as ERROR
    logWebSocketError(error, {
      'minitalk.operation': 'socket_connect',
      'minitalk.user': socket.userId,
      'minitalk.connect_error': true
    });
  });

  // Join user to their chat rooms
  joinUserRooms(socket);

  // Handle sending messages - ULTRA FAST QUEUE PROCESSING! 💥⚡ with detailed tracing
  socket.on('send_message', async (data) => {
    // Create root span for the entire WebSocket message handling
    const rootSpan = tracer.startSpan('websocket.handle_send_message', {
      attributes: {
        'websocket.event': 'send_message',
        'minitalk.operation': 'send_message',
        'minitalk.span.type': 'root',
        'minitalk.component': 'websocket',
        'minitalk.user': socket.userId,
        'minitalk.socket_id': socket.id
      }
    });
    
    try {
      const { roomId, content } = data;
      
      // Add message context to root span
      rootSpan.setAttributes({
        'minitalk.message.room_id': roomId,
        'minitalk.message.content_length': content ? content.length : 0,
        'minitalk.message.timestamp': new Date().toISOString()
      });
      const sender = socket.userId;

      // Child span 1: Input validation
      const validationSpan = createChildSpan(rootSpan, 'validation.message_input', {
        'minitalk.validation.type': 'message_input'
      });
      
      try {
      if (!roomId || !content) {
          throw new Error('roomId and content are required');
        }
        
        validationSpan.setAttributes({
          'minitalk.validation.success': true,
          'minitalk.validation.room_id_present': !!roomId,
          'minitalk.validation.content_present': !!content
        });
        validationSpan.setStatus({ code: 1 }); // OK
      } catch (validationError) {
        validationSpan.setStatus({ code: 2, message: validationError.message });
        validationSpan.setAttributes({
          'minitalk.validation.error': true,
          'minitalk.error.message': validationError.message
        });
        
        // Child span for error response
        const errorResponseSpan = createChildSpan(rootSpan, 'websocket.send_error_response', {
          'minitalk.response.type': 'validation_error'
        });
        
        try {
        socket.emit('error', { message: 'roomId and content are required' });
          errorResponseSpan.setStatus({ code: 1 }); // OK
        } finally {
          errorResponseSpan.end();
        }
        
        rootSpan.setStatus({ code: 2, message: validationError.message });
        rootSpan.setAttributes({
          'minitalk.error': true,
          'minitalk.error.type': 'validation_error'
        });
        
        return;
      } finally {
        validationSpan.end();
      }

      // Child span 2: Authorization check
      const authSpan = createChildSpan(rootSpan, 'authorization.check_room_membership', {
        'minitalk.authorization.room_id': roomId,
        'minitalk.authorization.user': sender
      });
      
      let chatRoom;
      try {
        chatRoom = await tracedDatabaseOperation(authSpan, 'find_chatroom_by_id', async () => {
          return await dataManager.findChatRoomByRoomId(roomId);
        });
        
      if (!chatRoom || !chatRoom.participants.includes(sender)) {
          throw new Error('You are not a member of this chat room');
        }
        
        authSpan.setAttributes({
          'minitalk.authorization.success': true,
          'minitalk.authorization.room_exists': !!chatRoom,
          'minitalk.authorization.is_participant': chatRoom ? chatRoom.participants.includes(sender) : false,
          'minitalk.authorization.participants_count': chatRoom ? chatRoom.participants.length : 0
        });
        authSpan.setStatus({ code: 1 }); // OK
      } catch (authError) {
        authSpan.setStatus({ code: 2, message: authError.message });
        authSpan.setAttributes({
          'minitalk.authorization.error': true,
          'minitalk.error.message': authError.message
        });
        
        // Child span for error response
        const errorResponseSpan = createChildSpan(rootSpan, 'websocket.send_error_response', {
          'minitalk.response.type': 'authorization_error'
        });
        
        try {
        socket.emit('error', { message: 'You are not a member of this chat room' });
          errorResponseSpan.setStatus({ code: 1 }); // OK
        } finally {
          errorResponseSpan.end();
        }
        
        rootSpan.setStatus({ code: 2, message: authError.message });
        rootSpan.setAttributes({
          'minitalk.error': true,
          'minitalk.error.type': 'authorization_error'
        });
        
        return;
      } finally {
        authSpan.end();
      }

      // Child span 3: Message queuing
      const queueSpan = createChildSpan(rootSpan, 'message_processor.queue_message_from_websocket', {
        'minitalk.message.sender': sender,
        'minitalk.message.room_id': roomId,
        'minitalk.message.content_length': content.length
      });
      
      try {
        const messageData = {
        roomId,
        sender,
        content,
        timestamp: new Date().toISOString(),
        io: io // Pass io for broadcasting
        };
        
        // Queue message for ULTRA FAST batch processing! 🚀
        messageProcessor.queueMessage(messageData, queueSpan);
        
        queueSpan.setAttributes({
          'minitalk.message.queued': true,
          'minitalk.queue.size_after': messageProcessor.messageQueue.length,
          'minitalk.message.timestamp': messageData.timestamp
        });
        queueSpan.setStatus({ code: 1 }); // OK
      } finally {
        queueSpan.end();
      }

      // Update root span with success info
      rootSpan.setAttributes({
        'minitalk.message.processed': true,
        'minitalk.message.sender': sender,
        'minitalk.message.room_id': roomId,
        'minitalk.queue.final_size': messageProcessor.messageQueue.length,
        'minitalk.success': true
      });
      rootSpan.setStatus({ code: 1 }); // OK

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
      
      // Child span for error handling
      const errorHandlingSpan = createChildSpan(rootSpan, 'error.handle_websocket_message', {
        'minitalk.error.type': error.name || 'UnknownError',
        'minitalk.error.message': error.message,
        'minitalk.user': socket.userId,
        'minitalk.socket_id': socket.id,
        'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
        'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024)
      });
      
      try {
        errorHandlingSpan.setAttributes({
          'minitalk.error.stack': error.stack,
          'minitalk.request.data': JSON.stringify(data)
        });
        
        // Check if this is a system overload error
        if (error.message.includes('memory') || error.message.includes('heap') || 
            error.message.includes('timeout') || error.message.includes('ECONNRESET') ||
            error.name === 'RangeError' || error.name === 'TimeoutError') {
          console.error('💀 CRITICAL: SYSTEM OVERLOAD DETECTED IN WEBSOCKET!');
          
          errorHandlingSpan.setAttributes({
            'minitalk.system_overload': true,
            'minitalk.failure_type': 'system_overload',
            'minitalk.severity': 'critical'
          });
          
          // Log as CRITICAL system error to OpenTelemetry
          logCriticalSystemError(error, {
            'minitalk.operation': 'send_message',
            'minitalk.user': socket.userId,
            'minitalk.system_overload': true,
            'minitalk.failure_type': 'system_overload'
          });
        }
        
        // Child span for error response
        const errorResponseSpan = createChildSpan(rootSpan, 'websocket.send_error_response', {
          'minitalk.response.type': 'system_error'
        });
        
        try {
      socket.emit('error', { message: 'Failed to send message' });
          errorResponseSpan.setStatus({ code: 1 }); // OK
        } finally {
          errorResponseSpan.end();
        }
        
        errorHandlingSpan.setStatus({ code: 2, message: error.message });
      } finally {
        errorHandlingSpan.end();
      }
      
      rootSpan.setStatus({ code: 2, message: error.message });
      rootSpan.setAttributes({
        'minitalk.error': true,
        'minitalk.error.type': error.name,
        'minitalk.error.message': error.message,
        'minitalk.system.memory_mb': Math.round(memUsage.heapUsed / 1024 / 1024)
      });
    } finally {
      rootSpan.end();
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
