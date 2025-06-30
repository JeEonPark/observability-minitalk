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

  // Handle sending messages - Simple individual processing
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
        'minitalk.validation.room_id_provided': !!roomId,
        'minitalk.validation.content_provided': !!content,
        'minitalk.validation.sender_provided': !!sender
      });

      try {
        if (!roomId || !content || !sender) {
          const errorMsg = 'Missing required fields: roomId, content, or sender';
          validationSpan.setStatus({ code: 2, message: errorMsg });
          validationSpan.setAttributes({
            'minitalk.validation.error': true,
            'minitalk.error.message': errorMsg
          });
          socket.emit('error', { message: errorMsg });
          return;
        }

        validationSpan.setStatus({ code: 1 }); // OK
        validationSpan.setAttributes({
          'minitalk.validation.success': true
        });
      } finally {
        validationSpan.end();
      }

      // Process message individually - no batching
      const messageData = {
        roomId,
        sender,
        content,
        timestamp: new Date().toISOString()
      };

      // Child span 2: Database operation
      const savedMessage = await tracedDatabaseOperation(rootSpan, 'create_message', async () => {
        return await dataManager.createMessage(messageData);
      });

      // Child span 3: Broadcast message
      const broadcastSpan = createChildSpan(rootSpan, 'websocket.broadcast_message', {
        'minitalk.broadcast.room_id': roomId,
        'minitalk.broadcast.sender': sender
      });

      try {
        io.to(roomId).emit('message', {
          type: 'message',
          roomId: roomId,
          sender: sender,
          content: content,
          timestamp: savedMessage.timestamp
        });

        broadcastSpan.setAttributes({
          'minitalk.broadcast.success': true,
          'minitalk.message.id': savedMessage.id
        });
        broadcastSpan.setStatus({ code: 1 }); // OK
      } finally {
        broadcastSpan.end();
      }

      rootSpan.setAttributes({
        'minitalk.message.processed': true,
        'minitalk.message.id': savedMessage.id
      });
      rootSpan.setStatus({ code: 1 }); // OK

    } catch (error) {
      console.error('Message processing error:', error);
      console.error('🚨 MESSAGE PROCESSING FAILURE:');
      console.error('❌ Error Type:', error.name);
      console.error('❌ Error Message:', error.message);
      console.error('❌ User:', socket.userId);
      console.error('❌ Socket ID:', socket.id);

      // Log memory usage during error
      const memUsage = process.memoryUsage();
      console.error('📊 Memory Usage at Error:');
      console.error(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      console.error(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

      // Child span for error handling
      const errorSpan = createChildSpan(rootSpan, 'error.handle_message_processing', {
        'minitalk.error.type': error.name || 'UnknownError',
        'minitalk.user': socket.userId,
        'minitalk.socket_id': socket.id,
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

      // If it's a critical error, log as CRITICAL
      if (error.message.includes('memory') || error.message.includes('heap') ||
        error.name === 'RangeError' || error.name === 'Error' && error.message.includes('Maximum')) {
        console.error('💀 CRITICAL: MEMORY-RELATED MESSAGE FAILURE!');

        // Log as CRITICAL system error to OpenTelemetry
        logCriticalSystemError(error, {
          'minitalk.operation': 'message_processing',
          'minitalk.failure_type': 'memory_related',
          'minitalk.user': socket.userId,
          'minitalk.system_unstable': true
        });
      }

      rootSpan.setStatus({ code: 2, message: error.message }); // ERROR
      rootSpan.setAttributes({
        'minitalk.message.error': true,
        'minitalk.error.message': error.message
      });

      socket.emit('error', { message: 'Failed to send message' });
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
