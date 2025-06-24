const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

class SafeFileDataManager {
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
    const newQueue = currentQueue.then(() => operation());
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
      
      console.log('Safe file storage initialized successfully');
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
      // Use atomic write with temporary file
      const tempFile = `${filePath}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
      await fs.rename(tempFile, filePath);
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  // Thread-safe user operations
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
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Thread-safe chatroom operations
  async createChatRoom(roomData) {
    return this.queueFileOperation(this.chatRoomsFile, async () => {
      const chatRooms = await this.readFile(this.chatRoomsFile);
      
      const newRoom = {
        roomId: roomData.roomId,
        name: roomData.name,
        participants: roomData.participants,
        createdBy: roomData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      chatRooms.push(newRoom);
      await this.writeFile(this.chatRoomsFile, chatRooms);
      
      return newRoom;
    });
  }

  // Thread-safe message operations
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

  // Other methods remain the same but use queued operations for writes...
  // (생략 - 나머지 메서드들도 동일한 패턴으로 수정)
}

module.exports = new SafeFileDataManager(); 
