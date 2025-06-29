const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all categories for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;

    let query = 'SELECT * FROM categories WHERE user_id = $1';
    const queryParams = [req.user.id];

    if (type) {
      query += ' AND type = $2';
      queryParams.push(type);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get category by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    // Validate input
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type must be either income or expense' });
    }

    // Check if category name already exists for this user
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE name = $1 AND user_id = $2',
      [name, req.user.id]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const result = await pool.query(
      'INSERT INTO categories (user_id, name, type, color, icon) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, type, color || '#3B82F6', icon || 'category']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, color, icon } = req.body;

    // Check if category exists and belongs to user
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Validate type if provided
    if (type && type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type must be either income or expense' });
    }

    // Check if new name conflicts with existing category
    if (name) {
      const nameConflict = await pool.query(
        'SELECT id FROM categories WHERE name = $1 AND user_id = $2 AND id != $3',
        [name, req.user.id, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }

    const result = await pool.query(
      'UPDATE categories SET name = COALESCE($1, name), type = COALESCE($2, type), color = COALESCE($3, color), icon = COALESCE($4, icon) WHERE id = $5 AND user_id = $6 RETURNING *',
      [name, type, color, icon, id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists and belongs to user
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category is being used by transactions
    const transactionsUsingCategory = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE category_id = $1',
      [id]
    );

    if (parseInt(transactionsUsingCategory.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category that is being used by transactions' 
      });
    }

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
