const express = require('express');
const jwt = require('jsonwebtoken');
const dataManager = require('../data/dataManager');

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

module.exports = router; 
