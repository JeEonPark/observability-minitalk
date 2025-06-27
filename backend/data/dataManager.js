const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

class FileDataManager {
  constructor() {
    this.dataDir = path.join(__dirname, 'storage');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.chatRoomsFile = path.join(this.dataDir, 'chatrooms.json');
    this.messagesFile = path.join(this.dataDir, 'messages.json');
    
    // File operation queues to prevent race conditions
    this.fileQueues = new Map();
    
    this.initializeStorage();
  }

  // Queue-based file operations to prevent race conditions
  async queueFileOperation(filePath, operation) {
    if (!this.fileQueues.has(filePath)) {
      this.fileQueues.set(filePath, Promise.resolve());
    }
    
    const currentQueue = this.fileQueues.get(filePath);
    const newQueue = currentQueue.then(() => operation()).catch(err => {
      console.error(`Queue operation failed for ${filePath}:`, err);
      throw err;
    });
    this.fileQueues.set(filePath, newQueue);
    
    return newQueue;
  }

  async initializeStorage() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Initialize files if they don't exist
      await this.initializeFile(this.usersFile, []);
      await this.initializeFile(this.chatRoomsFile, []);
      await this.initializeFile(this.messagesFile, []);
      
      console.log('File storage initialized successfully');
    } catch (error) {
      console.error('Error initializing file storage:', error);
    }
  }

  async initializeFile(filePath, defaultData) {
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  // User operations
  async createUser(userData) {
    return this.queueFileOperation(this.usersFile, async () => {
      const users = await this.readFile(this.usersFile);
      
      // Check if user already exists
      const existingUser = users.find(user => user.username === userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const newUser = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username: userData.username,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      users.push(newUser);
      await this.writeFile(this.usersFile, users);
      
      return { username: newUser.username, id: newUser.id };
    });
  }

  async findUserByUsername(username) {
    const users = await this.readFile(this.usersFile);
    return users.find(user => user.username === username);
  }

  async comparePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  }

  // ChatRoom operations
  async createChatRoom(roomData) {
    return this.queueFileOperation(this.chatRoomsFile, async () => {
      const chatRooms = await this.readFile(this.chatRoomsFile);
      
      const newChatRoom = {
        roomId: roomData.roomId,
        name: roomData.name,
        participants: roomData.participants,
        createdBy: roomData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      chatRooms.push(newChatRoom);
      await this.writeFile(this.chatRoomsFile, chatRooms);
      
      return newChatRoom;
    });
  }

  async findChatRoomByRoomId(roomId) {
    const chatRooms = await this.readFile(this.chatRoomsFile);
    return chatRooms.find(room => room.roomId === roomId);
  }

  async findChatRoomsByParticipant(username) {
    const chatRooms = await this.readFile(this.chatRoomsFile);
    return chatRooms.filter(room => room.participants.includes(username));
  }

  async updateChatRoom(roomId, updateData) {
    return this.queueFileOperation(this.chatRoomsFile, async () => {
      const chatRooms = await this.readFile(this.chatRoomsFile);
      const roomIndex = chatRooms.findIndex(room => room.roomId === roomId);
      
      if (roomIndex === -1) {
        throw new Error('Chat room not found');
      }

      chatRooms[roomIndex] = {
        ...chatRooms[roomIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await this.writeFile(this.chatRoomsFile, chatRooms);
      return chatRooms[roomIndex];
    });
  }

  async deleteChatRoom(roomId) {
    return this.queueFileOperation(this.chatRoomsFile, async () => {
      const chatRooms = await this.readFile(this.chatRoomsFile);
      const filteredRooms = chatRooms.filter(room => room.roomId !== roomId);
      
      if (filteredRooms.length === chatRooms.length) {
        throw new Error('Chat room not found');
      }

      await this.writeFile(this.chatRoomsFile, filteredRooms);
      
      // Also delete all messages for this room
      await this.deleteMessagesByRoomId(roomId);
      
      return true;
    });
  }

  // Message operations - individual processing only
  async createMessage(messageData) {
    return this.queueFileOperation(this.messagesFile, async () => {
      const messages = await this.readFile(this.messagesFile);
      
      const newMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        roomId: messageData.roomId,
        sender: messageData.sender,
        content: messageData.content,
        timestamp: messageData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      messages.push(newMessage);
      await this.writeFile(this.messagesFile, messages);
      
      return newMessage;
    });
  }

  async findMessagesByRoomId(roomId, options = {}) {
    const messages = await this.readFile(this.messagesFile);
    let roomMessages = messages.filter(message => message.roomId === roomId);
    
    // Filter by timestamp if provided
    if (options.since) {
      const sinceDate = new Date(options.since);
      roomMessages = roomMessages.filter(message => 
        new Date(message.timestamp) > sinceDate
      );
    }

    // Sort by timestamp
    roomMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Limit results
    if (options.limit) {
      roomMessages = roomMessages.slice(0, options.limit);
    }

    return roomMessages;
  }

  async deleteMessagesByRoomId(roomId) {
    return this.queueFileOperation(this.messagesFile, async () => {
      const messages = await this.readFile(this.messagesFile);
      const filteredMessages = messages.filter(message => message.roomId !== roomId);
      
      await this.writeFile(this.messagesFile, filteredMessages);
      return true;
    });
  }

  // Health check
  async isReady() {
    try {
      await fs.access(this.usersFile);
      await fs.access(this.chatRoomsFile);
      await fs.access(this.messagesFile);
      
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Utility methods
  async getAllUsers() {
    return await this.readFile(this.usersFile);
  }

  async deleteAllUsers() {
    return this.queueFileOperation(this.usersFile, async () => {
      await this.writeFile(this.usersFile, []);
      return true;
    });
  }

  async getAllChatRooms() {
    return await this.readFile(this.chatRoomsFile);
  }

  async deleteAllChatRooms() {
    return this.queueFileOperation(this.chatRoomsFile, async () => {
      await this.writeFile(this.chatRoomsFile, []);
      return true;
    });
  }

  async getAllMessages() {
    return await this.readFile(this.messagesFile);
  }

  async deleteAllMessages() {
    return this.queueFileOperation(this.messagesFile, async () => {
      await this.writeFile(this.messagesFile, []);
      return true;
    });
  }
}

module.exports = new FileDataManager(); 
