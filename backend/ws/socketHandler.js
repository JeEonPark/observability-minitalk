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

class MessageProcessor {
  constructor() {
    this.stats = {
      processed: 0,
      startTime: Date.now()
    };
  }
  
  async processMessage(messageData, parentSpan = null) {
    const processSpan = parentSpan ? 
      createChildSpan(parentSpan, 'message_processor.process_single', {
        'minitalk.message.individual': true
      }) : 
      tracer.startSpan('message_processor.process_single', {
        attributes: {
          'minitalk.component': 'message_processor',
          'minitalk.message.individual': true
        }
      });
    
    try {
      // Save message to database immediately
      const savedMessage = await tracedDatabaseOperation(processSpan, 'create_message', async () => {
        return await dataManager.createMessage({
          roomId: messageData.roomId,
          sender: messageData.sender,
          content: messageData.content,
          timestamp: messageData.timestamp
        });
      });
      
      // Broadcast message immediately
      messageData.io.to(messageData.roomId).emit('message', {
        type: 'message',
        roomId: messageData.roomId,
        sender: messageData.sender,
        content: messageData.content,
        timestamp: savedMessage.timestamp
      });
      
      this.stats.processed++;
      
      processSpan.setAttributes({
        'minitalk.message.processed': true,
        'minitalk.stats.total_processed': this.stats.processed
      });
      processSpan.setStatus({ code: 1 }); // OK
      
      return savedMessage;
    } catch (error) {
      console.error('Message processing error:', error);
      processSpan.setStatus({ code: 2, message: error.message });
      processSpan.setAttributes({
        'minitalk.message.error': true,
        'minitalk.error.message': error.message
      });
      throw error;
    } finally {
      processSpan.end();
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

  socket.on('send_message', async (data) => {
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

      // Child span 3: Process message immediately (no batching)
      const processSpan = createChildSpan(rootSpan, 'message_processor.process_immediate', {
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
          io: io
        };
        
        // Process message immediately - no queuing
        await messageProcessor.processMessage(messageData, processSpan);
        
        processSpan.setAttributes({
          'minitalk.message.processed': true,
          'minitalk.message.timestamp': messageData.timestamp
        });
        processSpan.setStatus({ code: 1 }); // OK
      } finally {
        processSpan.end();
      }

      // Update root span with success info
      rootSpan.setAttributes({
        'minitalk.message.processed': true,
        'minitalk.message.sender': sender,
        'minitalk.message.room_id': roomId,
        'minitalk.success': true
      });
      rootSpan.setStatus({ code: 1 }); // OK

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
          socket.emit('error', { message: 'Internal server error' });
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
        'minitalk.error.type': error.name || 'UnknownError'
      });
    } finally {
      rootSpan.end();
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.userId} disconnected: ${reason}`);
    
    // Log to OpenTelemetry
    const disconnectSpan = tracer.startSpan('websocket.disconnect', {
      attributes: {
        'minitalk.component': 'websocket',
        'minitalk.user': socket.userId,
        'minitalk.socket_id': socket.id,
        'minitalk.disconnect.reason': reason
      }
    });
    
    disconnectSpan.setStatus({ code: 1 }); // OK
    disconnectSpan.end();
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
