const express = require('express');
const { v4: uuidv4 } = require('uuid');
const dataManager = require('/app/data/dataManager');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create chatroom
router.post('/chatrooms', authenticateToken, async (req, res) => {
  try {
    const { name, participants = [] } = req.body;
    const createdBy = req.user.username;

    if (!name) {
      return res.status(400).json({ error: 'Chat room name is required' });
    }

    // Add creator to participants if not already included
    const allParticipants = [...new Set([createdBy, ...participants])];

    const roomId = uuidv4();
    const chatRoom = await dataManager.createChatRoom({
      roomId,
      name,
      participants: allParticipants,
      createdBy
    });

    res.status(201).json({ roomId, name, participants: allParticipants });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Get user's chatrooms
router.get('/chatrooms', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    
    const chatRooms = await dataManager.findChatRoomsByParticipant(username);

    // Format response to match expected structure
    const formattedRooms = chatRooms.map(room => ({
      roomId: room.roomId,
      name: room.name,
      participants: room.participants,
      createdBy: room.createdBy,
      createdAt: room.createdAt
    }));

    res.json(formattedRooms);
  } catch (error) {
    console.error('Get chatrooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
