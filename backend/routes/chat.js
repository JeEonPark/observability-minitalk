const express = require('express');
const { v4: uuidv4 } = require('uuid');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
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
    const chatRoom = new ChatRoom({
      roomId,
      name,
      participants: allParticipants,
      createdBy
    });

    await chatRoom.save();
    res.status(201).json({ roomId, name, participants: allParticipants });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's chatrooms
router.get('/chatrooms', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    
    const chatRooms = await ChatRoom.find({
      participants: username
    }).select('roomId name participants createdBy createdAt');

    res.json(chatRooms);
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

    const chatRoom = await ChatRoom.findOne({ roomId });
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user is participant of the room
    if (!chatRoom.participants.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this chat room' });
    }

    // Add new participants (avoid duplicates)
    const newParticipants = participants.filter(p => !chatRoom.participants.includes(p));
    chatRoom.participants.push(...newParticipants);

    await chatRoom.save();
    res.json({ message: 'Users invited successfully', participants: chatRoom.participants });
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
    const chatRoom = await ChatRoom.findOne({ roomId });
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    if (!chatRoom.participants.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this chat room' });
    }

    // Build query
    const query = { roomId };
    if (since) {
      query.timestamp = { $gt: new Date(since) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .limit(100)
      .select('sender content timestamp');

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chatroom
router.delete('/chatrooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const username = req.user.username;

    // Find the chat room
    const chatRoom = await ChatRoom.findOne({ roomId });
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user is the creator of the room
    if (chatRoom.createdBy !== username) {
      return res.status(403).json({ error: 'Only the room creator can delete this chat room' });
    }

    // Delete all messages in the room
    await Message.deleteMany({ roomId });

    // Delete the chat room
    await ChatRoom.deleteOne({ roomId });

    res.json({ message: 'Chat room deleted successfully' });
  } catch (error) {
    console.error('Delete chatroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
