const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

const handleSocketConnection = (socket, io) => {
  console.log(`User ${socket.userId} connected with socket ID: ${socket.id}`);

  // Join user to their chat rooms
  joinUserRooms(socket);

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { roomId, content } = data;
      const sender = socket.userId;

      if (!roomId || !content) {
        socket.emit('error', { message: 'roomId and content are required' });
        return;
      }

      // Verify user is participant of the room
      const chatRoom = await ChatRoom.findOne({ roomId });
      if (!chatRoom || !chatRoom.participants.includes(sender)) {
        socket.emit('error', { message: 'You are not a member of this chat room' });
        return;
      }

      // Save message to database
      const message = new Message({
        roomId,
        sender,
        content,
        timestamp: new Date()
      });

      await message.save();

      // Broadcast message to all participants in the room
      const messageData = {
        type: 'message',
        roomId,
        sender,
        content,
        timestamp: message.timestamp.toISOString()
      };

      io.to(roomId).emit('message', messageData);
      console.log(`Message sent in room ${roomId} by ${sender} (socket: ${socket.id})`);

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
      const chatRoom = await ChatRoom.findOne({ roomId });
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
    const chatRooms = await ChatRoom.find({
      participants: username
    }).select('roomId');

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
