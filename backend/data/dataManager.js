const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

class FileDataManager {
  constructor() {
    this.dataDir = path.join(__dirname, 'storage');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.chatRoomsFile = path.join(this.dataDir, 'chatrooms.json');
    this.messagesFile = path.join(this.dataDir, 'messages.json');

    // Message file splitting configuration 📂
    this.maxMessagesPerFile = 100000; // 10만개 메시지당 파일 분할
    this.messageFilePrefix = path.join(this.dataDir, 'messages_');
    this.currentMessageFileIndex = 1;

    // File operation queues to prevent race conditions - 50M users ready! 🚀
    this.fileQueues = new Map();

    // Memory cache to reduce file I/O and prevent "too many open files" 💾
    this.cache = new Map();
    this.cacheTimeout = 3000; // 3 seconds cache timeout
    this.lastCacheUpdate = new Map();

    // File read throttling to prevent file descriptor exhaustion
    this.activeReads = new Map();
    this.maxConcurrentReads = 5; // Maximum 5 concurrent file reads per file

    // 🚀 NEW: Buffer management for high-performance messaging
    this.messageBuffer = new Map();
    this.bufferSize = 50; // Optimized: Buffer 50 messages before writing
    this.bufferTimeout = 1000; // Write buffer every 1 second
    this.bufferLocks = new Map();
    this.bufferTimers = new Map(); // roomId -> timer

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

      // Initialize message file splitting system
      await this.initializeMessageFiles();

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
    // Check cache first to reduce file I/O 🚀
    const cacheKey = filePath;
    const lastUpdate = this.lastCacheUpdate.get(cacheKey);
    const now = Date.now();

    if (lastUpdate && (now - lastUpdate) < this.cacheTimeout && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Throttle concurrent reads to prevent "too many open files"
    const activeCount = this.activeReads.get(filePath) || 0;
    if (activeCount >= this.maxConcurrentReads) {
      // Wait a bit and use cache if available
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      // Brief wait before retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      // Track active reads
      this.activeReads.set(filePath, activeCount + 1);

      const data = await fs.readFile(filePath, 'utf8');
      const parsedData = JSON.parse(data);

      // Update cache
      this.cache.set(cacheKey, parsedData);
      this.lastCacheUpdate.set(cacheKey, now);

      return parsedData;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);

      // Return cached data if available, otherwise return empty array
      if (this.cache.has(cacheKey)) {
        console.log(`Using cached data for ${filePath} due to read error`);
        return this.cache.get(cacheKey);
      }

      return [];
    } finally {
      // Decrease active read count
      const currentCount = this.activeReads.get(filePath) || 1;
      this.activeReads.set(filePath, Math.max(0, currentCount - 1));
    }
  }

  async writeFile(filePath, data) {
    try {
      // Atomic write with temporary file to prevent corruption
      const tempFile = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
      await fs.rename(tempFile, filePath);

      // Update cache with new data to keep it fresh 🚀
      const cacheKey = filePath;
      this.cache.set(cacheKey, data);
      this.lastCacheUpdate.set(cacheKey, Date.now());

    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  // User operations - Thread-safe for massive scale! 🚀
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

  // Chat room operations
  async createChatRoom(roomData) {
    return this.queueFileOperation(this.chatRoomsFile, async () => {
      const chatRooms = await this.readFile(this.chatRoomsFile);

      const newChatRoom = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        roomId: roomData.roomId,
        name: roomData.name,
        participants: roomData.participants || [],
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

      if (chatRooms.length === filteredRooms.length) {
        throw new Error('Chat room not found');
      }

      await this.writeFile(this.chatRoomsFile, filteredRooms);

      // Also delete all messages in this room
      await this.deleteMessagesByRoomId(roomId);

      return true;
    });
  }

  // 🚀 OPTIMIZED: Message operations with buffering for high performance
  async createMessage(messageData) {
    const { roomId } = messageData;

    // Generate message ID immediately for fast response
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    const newMessage = {
      id: messageId,
      roomId: messageData.roomId,
      sender: messageData.sender,
      content: messageData.content,
      timestamp: messageData.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Add to buffer for batch processing (non-blocking)
    this.addToBuffer(roomId, newMessage);

    // Return immediately for fast response
    return newMessage;
  }

  // 🚀 NEW: Buffer management for high-performance messaging
  addToBuffer(roomId, message) {
    // Initialize buffer for this room if not exists
    if (!this.messageBuffer.has(roomId)) {
      this.messageBuffer.set(roomId, []);
    }

    // Add message to buffer
    this.messageBuffer.get(roomId).push(message);

    // Check if buffer is full or timer needs to be set
    const buffer = this.messageBuffer.get(roomId);

    if (buffer.length >= this.bufferSize) {
      // Buffer is full, flush immediately
      this.flushBuffer(roomId);
    } else if (!this.bufferTimers.has(roomId)) {
      // Set timer for delayed flush
      const timer = setTimeout(() => {
        this.flushBuffer(roomId);
      }, this.bufferTimeout);

      this.bufferTimers.set(roomId, timer);
    }
  }

  // 🚀 NEW: Flush buffer to disk
  async flushBuffer(roomId) {
    // Prevent concurrent flushes for the same room
    if (this.bufferLocks.has(roomId)) {
      return;
    }

    const flushPromise = this.performFlush(roomId);
    this.bufferLocks.set(roomId, flushPromise);

    try {
      await flushPromise;
    } finally {
      this.bufferLocks.delete(roomId);
    }
  }

  // 🚀 NEW: Perform actual flush operation
  async performFlush(roomId) {
    // Clear timer
    if (this.bufferTimers.has(roomId)) {
      clearTimeout(this.bufferTimers.get(roomId));
      this.bufferTimers.delete(roomId);
    }

    // Get messages from buffer
    const buffer = this.messageBuffer.get(roomId) || [];
    if (buffer.length === 0) return;

    // Clear buffer immediately to prevent memory buildup
    this.messageBuffer.set(roomId, []);

    // Process messages in background (non-blocking)
    setImmediate(async () => {
      try {
        await this.writeMessagesToFile(buffer);
      } catch (error) {
        console.error(`Error flushing buffer for room ${roomId}:`, error);
        // Re-add messages to buffer for retry
        const currentBuffer = this.messageBuffer.get(roomId) || [];
        this.messageBuffer.set(roomId, [...buffer, ...currentBuffer]);
      }
    });
  }

  // 🚀 NEW: Write multiple messages to file efficiently
  async writeMessagesToFile(messages) {
    if (messages.length === 0) return;

    const currentFile = this.getCurrentMessageFile();
    return this.queueFileOperation(currentFile, async () => {
      let activeFile = this.getCurrentMessageFile();
      let existingMessages = await this.readFile(activeFile);

      // Check if current file will be full after adding messages
      if (existingMessages.length + messages.length >= this.maxMessagesPerFile) {
        // Save current file and create new one
        await this.writeFile(activeFile, existingMessages);
        await this.createNewMessageFile();
        activeFile = this.getCurrentMessageFile();
        existingMessages = [];
      }

      // Add all messages at once
      existingMessages.push(...messages);
      await this.writeFile(activeFile, existingMessages);

      return messages.length;
    });
  }

  // 🚀 NEW: Force flush all buffers (for shutdown)
  async flushAllBuffers() {
    const roomIds = Array.from(this.messageBuffer.keys());
    const flushPromises = roomIds.map(roomId => this.flushBuffer(roomId));

    await Promise.all(flushPromises);
    console.log(`✅ Flushed ${roomIds.length} message buffers`);
  }

  async findMessagesByRoomId(roomId, options = {}) {
    const messageFiles = await this.getAllMessageFiles();
    let allMessages = [];

    // Read messages from all files
    for (const messageFile of messageFiles) {
      try {
        const messages = await this.readFile(messageFile);
        const roomMessages = messages.filter(message => message.roomId === roomId);
        allMessages.push(...roomMessages);
      } catch (error) {
        console.error(`Error reading message file ${messageFile}:`, error);
        // Continue with other files
      }
    }

    // Filter by timestamp if provided
    if (options.since) {
      const sinceDate = new Date(options.since);
      allMessages = allMessages.filter(message =>
        new Date(message.timestamp) > sinceDate
      );
    }

    // Sort by timestamp
    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Limit results
    if (options.limit) {
      allMessages = allMessages.slice(0, options.limit);
    }

    return allMessages;
  }

  async deleteMessagesByRoomId(roomId) {
    const messageFiles = await this.getAllMessageFiles();
    let totalDeleted = 0;

    // Delete messages from all files
    for (const messageFile of messageFiles) {
      await this.queueFileOperation(messageFile, async () => {
        try {
          const messages = await this.readFile(messageFile);
          const beforeCount = messages.length;
          const filteredMessages = messages.filter(message => message.roomId !== roomId);
          const deletedCount = beforeCount - filteredMessages.length;

          if (deletedCount > 0) {
            await this.writeFile(messageFile, filteredMessages);
            totalDeleted += deletedCount;
          }
        } catch (error) {
          console.error(`Error deleting messages from ${messageFile}:`, error);
        }
      });
    }

    return true;
  }

  // Cache management to prevent memory leaks 🧹
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.lastCacheUpdate.entries()) {
      if (now - timestamp > this.cacheTimeout * 2) { // Clear cache older than 2x timeout
        this.cache.delete(key);
        this.lastCacheUpdate.delete(key);
      }
    }
  }

  // Periodic cache cleanup
  startCacheCleanup() {
    setInterval(() => {
      this.clearExpiredCache();
    }, this.cacheTimeout);
  }

  // 🚀 NEW: Get buffer statistics for monitoring
  getBufferStats() {
    const stats = {
      totalRooms: this.messageBuffer.size,
      totalBufferedMessages: 0,
      roomStats: []
    };

    for (const [roomId, buffer] of this.messageBuffer.entries()) {
      const roomStat = {
        roomId,
        messageCount: buffer.length,
        hasTimer: this.bufferTimers.has(roomId),
        hasLock: this.bufferLocks.has(roomId)
      };

      stats.totalBufferedMessages += buffer.length;
      stats.roomStats.push(roomStat);
    }

    return stats;
  }

  // 🚀 NEW: Health check with buffer monitoring
  async isReady() {
    try {
      await fs.access(this.usersFile);
      await fs.access(this.chatRoomsFile);

      // Check message files
      const messageFiles = await this.getAllMessageFiles();
      for (const messageFile of messageFiles) {
        await fs.access(messageFile);
      }

      // Check buffer health
      const bufferStats = this.getBufferStats();
      if (bufferStats.totalBufferedMessages > 1000) {
        console.warn(`⚠️ High buffer usage: ${bufferStats.totalBufferedMessages} messages buffered`);
      }

      // Health check passed silently

      // Start cache cleanup if not already started
      if (!this.cacheCleanupStarted) {
        this.startCacheCleanup();
        this.cacheCleanupStarted = true;
      }

      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Message file splitting utilities 📂
  async initializeMessageFiles() {
    try {
      // Find existing message files and determine current index
      const files = await fs.readdir(this.dataDir);
      const messageFiles = files.filter(file => file.startsWith('messages_') && file.endsWith('.json'));

      if (messageFiles.length > 0) {
        // Extract indices and find the highest
        const indices = messageFiles.map(file => {
          const match = file.match(/messages_(\d+)\.json/);
          return match ? parseInt(match[1]) : 0;
        });
        this.currentMessageFileIndex = Math.max(...indices);
        console.log(`📂 Found ${messageFiles.length} message files, current index: ${this.currentMessageFileIndex}`);
      } else {
        // Create first message file
        await this.initializeFile(this.getCurrentMessageFile(), []);
        console.log(`📂 Created first message file: ${this.getCurrentMessageFile()}`);
      }
    } catch (error) {
      console.error('Error initializing message files:', error);
      // Fallback to index 1
      this.currentMessageFileIndex = 1;
      await this.initializeFile(this.getCurrentMessageFile(), []);
    }
  }

  getCurrentMessageFile() {
    return `${this.messageFilePrefix}${this.currentMessageFileIndex}.json`;
  }

  async getAllMessageFiles() {
    try {
      const files = await fs.readdir(this.dataDir);
      const messageFiles = files
        .filter(file => file.startsWith('messages_') && file.endsWith('.json'))
        .sort((a, b) => {
          const aIndex = parseInt(a.match(/messages_(\d+)\.json/)[1]);
          const bIndex = parseInt(b.match(/messages_(\d+)\.json/)[1]);
          return aIndex - bIndex;
        })
        .map(file => path.join(this.dataDir, file));

      // Also include the legacy messages.json if it exists
      const legacyFile = this.messagesFile;
      try {
        await fs.access(legacyFile);
        messageFiles.unshift(legacyFile);
      } catch (error) {
        // Legacy file doesn't exist, that's okay
      }

      return messageFiles;
    } catch (error) {
      console.error('Error getting message files:', error);
      return [this.getCurrentMessageFile()];
    }
  }

  async shouldCreateNewMessageFile() {
    const currentFile = this.getCurrentMessageFile();
    try {
      const messages = await this.readFile(currentFile);
      return messages.length >= this.maxMessagesPerFile;
    } catch (error) {
      return false;
    }
  }

  async createNewMessageFile() {
    this.currentMessageFileIndex++;
    const newFile = this.getCurrentMessageFile();
    await this.initializeFile(newFile, []);
    console.log(`📂 Created new message file: ${newFile} (index: ${this.currentMessageFileIndex})`);
    return newFile;
  }

  // Get all users - for admin operations
  async getAllUsers() {
    return await this.readFile(this.usersFile);
  }

  // DELETE ALL USERS - DANGER ZONE! 🚨⚠️
  async deleteAllUsers() {
    return this.queueFileOperation(this.usersFile, async () => {
      const users = await this.readFile(this.usersFile);
      const userCount = users.length;

      console.log(`🚨 DANGER ZONE: Deleting ALL ${userCount} users from storage!`);

      // Clear all users
      await this.writeFile(this.usersFile, []);

      console.log(`✅ All users deleted from storage! Deleted: ${userCount} users`);

      return {
        deletedCount: userCount,
        timestamp: new Date().toISOString()
      };
    });
  }

  // DELETE ALL MESSAGES - DANGER ZONE! 🚨⚠️
  async deleteAllMessages() {
    const messageFiles = await this.getAllMessageFiles();
    let totalDeleted = 0;

    console.log(`🚨 DANGER ZONE: Deleting ALL messages from ${messageFiles.length} files!`);

    // Delete messages from all files
    for (const messageFile of messageFiles) {
      await this.queueFileOperation(messageFile, async () => {
        try {
          const messages = await this.readFile(messageFile);
          const messageCount = messages.length;

          if (messageCount > 0) {
            await this.writeFile(messageFile, []);
            totalDeleted += messageCount;
            console.log(`🗑️ Cleared ${messageCount} messages from ${messageFile}`);
          }
        } catch (error) {
          console.error(`Error deleting messages from ${messageFile}:`, error);
        }
      });
    }

    console.log(`✅ All messages deleted from storage! Deleted: ${totalDeleted} messages across ${messageFiles.length} files`);

    return {
      deletedCount: totalDeleted,
      filesCleared: messageFiles.length,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new FileDataManager(); 
