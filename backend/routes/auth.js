const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Create default categories
    const defaultCategories = [
      { name: 'Salary', type: 'income', color: '#10B981', icon: 'work' },
      { name: 'Freelance', type: 'income', color: '#3B82F6', icon: 'business' },
      { name: 'Investment', type: 'income', color: '#8B5CF6', icon: 'trending_up' },
      { name: 'Food & Dining', type: 'expense', color: '#F59E0B', icon: 'restaurant' },
      { name: 'Transportation', type: 'expense', color: '#EF4444', icon: 'directions_car' },
      { name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'movie' },
      { name: 'Shopping', type: 'expense', color: '#06B6D4', icon: 'shopping_bag' },
      { name: 'Bills & Utilities', type: 'expense', color: '#84CC16', icon: 'receipt' },
      { name: 'Healthcare', type: 'expense', color: '#F97316', icon: 'local_hospital' },
      { name: 'Education', type: 'expense', color: '#6366F1', icon: 'school' }
    ];

    for (const category of defaultCategories) {
      await pool.query(
        'INSERT INTO categories (user_id, name, type, color, icon) VALUES ($1, $2, $3, $4, $5)',
        [user.id, category.name, category.type, category.color, category.icon]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
