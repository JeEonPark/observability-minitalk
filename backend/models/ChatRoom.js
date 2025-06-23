const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  participants: [{
    type: String,
    required: true
  }],
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema); 
