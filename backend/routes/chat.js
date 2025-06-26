const express = require('express');
const { v4: uuidv4 } = require('uuid');
const dataManager = require('/app/data/dataManager');
const { authenticateToken } = require('../middleware/auth');

// OpenTelemetry imports for custom tracing
const { trace, context } = require('@opentelemetry/api');
const tracer = trace.getTracer('minitalk-backend', '1.0.1');

const router = express.Router();

// Helper function to create child spans with proper context
function createChildSpan(parentSpan, name, attributes = {}) {
  return tracer.startSpan(name, {
    parent: parentSpan,
    attributes: {
      'minitalk.span.type': 'child',
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

// Helper function for validation with tracing
function tracedValidation(parentSpan, validationName, validationFn) {
  const validationSpan = createChildSpan(parentSpan, `validation.${validationName}`, {
    'minitalk.validation.type': validationName,
    'minitalk.component': 'validation'
  });
  
  try {
    const result = validationFn();
    validationSpan.setStatus({ code: 1 }); // OK
    validationSpan.setAttributes({
      'minitalk.validation.success': true,
      'minitalk.validation.result': typeof result === 'boolean' ? result : 'validated'
    });
    return result;
  } catch (error) {
    validationSpan.setStatus({ code: 2, message: error.message }); // ERROR
    validationSpan.setAttributes({
      'minitalk.validation.error': true,
      'minitalk.error.message': error.message
    });
    throw error;
  } finally {
    validationSpan.end();
  }
}

// Create chatroom with detailed parent-child tracing
router.post('/chatrooms', authenticateToken, async (req, res) => {
  // Parent span for the entire HTTP request
  const rootSpan = tracer.startSpan('http.post.chatrooms.create', {
    attributes: {
      'http.method': 'POST',
      'http.route': '/chatrooms',
      'minitalk.operation': 'create_chatroom',
      'minitalk.span.type': 'root',
      'minitalk.component': 'api'
    }
  });
  
  try {
    const { name, participants = [] } = req.body;
    const createdBy = req.user.username;

    // Add user context to root span
    rootSpan.setAttributes({
      'minitalk.user': createdBy,
      'minitalk.chatroom.name': name,
      'minitalk.participants.count': participants.length,
      'minitalk.request.body.size': JSON.stringify(req.body).length
    });

    // Child span 1: Input validation
    tracedValidation(rootSpan, 'chatroom_name', () => {
      if (!name) {
        throw new Error('Chat room name is required');
      }
      return true;
    });

    // Child span 2: Participant processing
    const participantSpan = createChildSpan(rootSpan, 'business_logic.process_participants', {
      'minitalk.component': 'business_logic',
      'minitalk.participants.input_count': participants.length
    });
    
    let allParticipants;
    try {
      // Add creator to participants if not already included
      allParticipants = [...new Set([createdBy, ...participants])];
      participantSpan.setAttributes({
        'minitalk.participants.final_count': allParticipants.length,
        'minitalk.participants.creator_added': !participants.includes(createdBy)
      });
      participantSpan.setStatus({ code: 1 }); // OK
    } finally {
      participantSpan.end();
    }

    // Child span 3: Generate room ID
    const idGenerationSpan = createChildSpan(rootSpan, 'business_logic.generate_room_id', {
      'minitalk.component': 'business_logic'
    });
    
    let roomId;
    try {
      roomId = uuidv4();
      idGenerationSpan.setAttributes({
        'minitalk.chatroom.id': roomId,
        'minitalk.id.generation.method': 'uuid_v4'
      });
      idGenerationSpan.setStatus({ code: 1 }); // OK
    } finally {
      idGenerationSpan.end();
    }

    // Child span 4: Database operation
    const chatRoom = await tracedDatabaseOperation(rootSpan, 'create_chatroom', async () => {
      return await dataManager.createChatRoom({
        roomId,
        name,
        participants: allParticipants,
        createdBy
      });
    });

    // Child span 5: Response formatting
    const responseSpan = createChildSpan(rootSpan, 'response.format_success', {
      'minitalk.component': 'response',
      'minitalk.response.status': 201
    });
    
    let responseData;
    try {
      responseData = { roomId, name, participants: allParticipants };
      responseSpan.setAttributes({
        'minitalk.response.chatroom.id': roomId,
        'minitalk.response.participants.count': allParticipants.length,
        'minitalk.response.size': JSON.stringify(responseData).length
      });
      responseSpan.setStatus({ code: 1 }); // OK
    } finally {
      responseSpan.end();
    }

    // Update root span with success info
    rootSpan.setAttributes({
      'minitalk.chatroom.id': roomId,
      'minitalk.response.status': 201,
      'minitalk.success': true
    });
    rootSpan.setStatus({ code: 1 }); // OK

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Create chatroom error:', error);
    
    // Child span for error handling
    const errorSpan = createChildSpan(rootSpan, 'error.handle_create_chatroom', {
      'minitalk.component': 'error_handler',
      'minitalk.error.type': error.name || 'UnknownError'
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

    rootSpan.setStatus({ code: 2, message: error.message }); // ERROR
    rootSpan.setAttributes({
      'minitalk.error': true,
      'minitalk.error.message': error.message,
      'minitalk.response.status': 500
    });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    rootSpan.end();
  }
});

// MEGA BATCH CHATROOM CREATION for ULTRA SPEED! 🏠🚀
router.post('/chatrooms-batch', authenticateToken, async (req, res) => {
  try {
    const { rooms } = req.body;
    const createdBy = req.user.username;

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: 'Rooms array is required' });
    }

    // Prepare rooms data with UUIDs and creator
    const roomsData = rooms.map(room => {
      if (!room.name) {
        throw new Error('All rooms must have a name');
      }

      // Add creator to participants if not already included
      const allParticipants = [...new Set([createdBy, ...(room.participants || [])])];

      return {
        roomId: uuidv4(),
        name: room.name,
        participants: allParticipants,
        createdBy
      };
    });

    // Create rooms in batch using dataManager
    const result = await dataManager.createChatRoomsBatch(roomsData);

    // Format response
    const formattedCreated = result.created.map(room => ({
      roomId: room.roomId,
      name: room.name,
      participants: room.participants
    }));

    res.status(201).json({
      message: `Batch room creation completed: ${result.created.length} rooms created, ${result.errors.length} errors`,
      created: formattedCreated,
      errors: result.errors
    });
  } catch (error) {
    console.error('Batch chatroom creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's chatrooms with parent-child tracing
router.get('/chatrooms', authenticateToken, async (req, res) => {
  // Parent span for the entire HTTP request
  const rootSpan = tracer.startSpan('http.get.chatrooms.list', {
    attributes: {
      'http.method': 'GET',
      'http.route': '/chatrooms',
      'minitalk.operation': 'list_chatrooms',
      'minitalk.span.type': 'root',
      'minitalk.component': 'api'
    }
  });
  
  try {
    const username = req.user.username;
    
    rootSpan.setAttributes({
      'minitalk.user': username
    });

    // Child span 1: Database query
    const chatRooms = await tracedDatabaseOperation(rootSpan, 'find_chatrooms_by_participant', async () => {
      return await dataManager.findChatRoomsByParticipant(username);
    });

    // Child span 2: Data transformation
    const transformSpan = createChildSpan(rootSpan, 'business_logic.transform_chatrooms', {
      'minitalk.component': 'business_logic',
      'minitalk.chatrooms.raw_count': chatRooms.length
    });
    
    let formattedRooms;
    try {
      formattedRooms = chatRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        participants: room.participants,
        createdBy: room.createdBy,
        createdAt: room.createdAt
      }));
      
      transformSpan.setAttributes({
        'minitalk.chatrooms.formatted_count': formattedRooms.length,
        'minitalk.transformation.success': true
      });
      transformSpan.setStatus({ code: 1 }); // OK
    } finally {
      transformSpan.end();
    }

    // Child span 3: Response formatting
    const responseSpan = createChildSpan(rootSpan, 'response.format_chatrooms_list', {
      'minitalk.component': 'response',
      'minitalk.response.status': 200
    });
    
    try {
      responseSpan.setAttributes({
        'minitalk.response.chatrooms.count': formattedRooms.length,
        'minitalk.response.size': JSON.stringify(formattedRooms).length
      });
      responseSpan.setStatus({ code: 1 }); // OK
    } finally {
      responseSpan.end();
    }

    rootSpan.setAttributes({
      'minitalk.chatrooms.count': formattedRooms.length,
      'minitalk.response.status': 200,
      'minitalk.success': true
    });
    rootSpan.setStatus({ code: 1 }); // OK

    res.json(formattedRooms);
  } catch (error) {
    console.error('Get chatrooms error:', error);
    
    // Child span for error handling
    const errorSpan = createChildSpan(rootSpan, 'error.handle_get_chatrooms', {
      'minitalk.component': 'error_handler',
      'minitalk.error.type': error.name || 'UnknownError'
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

    rootSpan.setStatus({ code: 2, message: error.message }); // ERROR
    rootSpan.setAttributes({
      'minitalk.error': true,
      'minitalk.error.message': error.message,
      'minitalk.response.status': 500
    });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    rootSpan.end();
  }
});

// Invite users to chatroom
router.post('/chatrooms/:roomId/invite', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { participants } = req.body;
    const username = req.user.username;

    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'Participants array is required' });
    }

    const chatRoom = await dataManager.findChatRoomByRoomId(roomId);
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user is participant of the room
    if (!chatRoom.participants.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this chat room' });
    }

    // Add new participants (avoid duplicates)
    const newParticipants = participants.filter(p => !chatRoom.participants.includes(p));
    const updatedParticipants = [...chatRoom.participants, ...newParticipants];

    const updatedRoom = await dataManager.updateChatRoom(roomId, {
      participants: updatedParticipants
    });

    res.json({ message: 'Users invited successfully', participants: updatedRoom.participants });
  } catch (error) {
    console.error('Invite users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages from chatroom
router.get('/chatrooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { since } = req.query;
    const username = req.user.username;

    // Check if user is participant of the room
    const chatRoom = await dataManager.findChatRoomByRoomId(roomId);
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    if (!chatRoom.participants.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this chat room' });
    }

    // Get messages with options
    const options = { limit: 100 };
    if (since) {
      options.since = since;
    }

    const messages = await dataManager.findMessagesByRoomId(roomId, options);

    // Format response to match expected structure
    const formattedMessages = messages.map(message => ({
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave chatroom
router.post('/chatrooms/:roomId/leave', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const username = req.user.username;

    // Find the chat room
    const chatRoom = await dataManager.findChatRoomByRoomId(roomId);
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user is a participant of the room
    if (!chatRoom.participants.includes(username)) {
      return res.status(404).json({ error: 'You are not a member of this chat room' });
    }

    // Remove user from participants
    const updatedParticipants = chatRoom.participants.filter(participant => participant !== username);
    
    // If no participants left, delete the room entirely
    if (updatedParticipants.length === 0) {
      await dataManager.deleteChatRoom(roomId);
      return res.json({ message: 'Chat room deleted as no participants remain' });
    }

    // Update the chat room with new participants list
    await dataManager.updateChatRoom(roomId, {
      participants: updatedParticipants
    });

    res.json({ message: 'Successfully left the chat room' });
  } catch (error) {
    console.error('Leave chatroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE ALL MESSAGES - DANGER ZONE! 🚨⚠️
router.delete('/messages/delete-all', authenticateToken, async (req, res) => {
  try {
    const { confirmationCode } = req.body;

    // Safety check - require confirmation code
    if (confirmationCode !== 'DELETE_ALL_MESSAGES_CONFIRM') {
      return res.status(400).json({ 
        error: 'Invalid confirmation code. This is a dangerous operation!' 
      });
    }

    console.log(`🚨 DANGER ZONE: Deleting ALL messages!`);
    
    // Delete all messages using dataManager
    const result = await dataManager.deleteAllMessages();

    console.log(`✅ All messages deleted successfully! Deleted: ${result.deletedCount} messages`);

    res.json({
      message: `All messages deleted successfully! Deleted: ${result.deletedCount} messages`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete all messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
