const express = require('express');
const jwt = require('jsonwebtoken');
const dataManager = require('/app/data/dataManager');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Create new user using dataManager
    const user = await dataManager.createUser({ username, password });

    res.status(201).json({ message: 'User created successfully', username: user.username });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.message === 'Username already exists') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MEGA BATCH USER SIGNUP for ULTRA SPEED! 👥🚀
router.post('/signup-batch', async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array is required' });
    }

    // Validate all users have required fields
    for (const user of users) {
      if (!user.username || !user.password) {
        return res.status(400).json({ error: 'All users must have username and password' });
      }
    }

    // Create users in batch using dataManager
    const result = await dataManager.createUsersBatch(users);

    res.status(201).json({
      message: `Batch signup completed: ${result.created.length} users created, ${result.errors.length} errors`,
      created: result.created,
      errors: result.errors
    });
  } catch (error) {
    console.error('Batch signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user using dataManager
    const user = await dataManager.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using dataManager
    const isValidPassword = await dataManager.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MEGA BATCH LOGIN for ULTRA SPEED! 🔑🚀
router.post('/login-batch', async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array is required' });
    }

    // Validate all users have required fields
    for (const user of users) {
      if (!user.username || !user.password) {
        return res.status(400).json({ error: 'All users must have username and password' });
      }
    }

    const results = [];
    const errors = [];

    // Process all logins in batch
    for (const userData of users) {
      try {
        // Find user using dataManager
        const user = await dataManager.findUserByUsername(userData.username);
        if (!user) {
          errors.push({ username: userData.username, error: 'User not found' });
          continue;
        }

        // Check password using dataManager
        const isValidPassword = await dataManager.comparePassword(userData.password, user.password);
        if (!isValidPassword) {
          errors.push({ username: userData.username, error: 'Invalid password' });
          continue;
        }

        // Generate JWT token
        const token = jwt.sign(
          { username: user.username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        results.push({
          username: user.username,
          token: token
        });
      } catch (error) {
        errors.push({ username: userData.username, error: error.message });
      }
    }

    res.json({
      message: `Batch login completed: ${results.length} successful, ${errors.length} errors`,
      results: results,
      errors: errors
    });
  } catch (error) {
    console.error('Batch login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE ALL USERS - DANGER ZONE! 🚨⚠️
router.delete('/delete-all-users', async (req, res) => {
  try {
    const { confirmationCode } = req.body;

    // Safety check - require confirmation code
    if (confirmationCode !== 'DELETE_ALL_USERS_CONFIRM') {
      return res.status(400).json({ 
        error: 'Invalid confirmation code. This is a dangerous operation!' 
      });
    }

    // Get current user count before deletion
    const allUsers = await dataManager.getAllUsers();
    const userCount = allUsers.length;

    console.log(`🚨 DANGER ZONE: Deleting ALL ${userCount} users!`);
    
    // Delete all users using dataManager
    const result = await dataManager.deleteAllUsers();

    console.log(`✅ All users deleted successfully! Deleted: ${userCount} users`);

    res.json({
      message: `All users deleted successfully! Deleted: ${userCount} users`,
      deletedCount: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
