const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all transactions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, category_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const queryParams = [req.user.id];
    let paramCount = 1;

    // Add filters
    if (type) {
      paramCount++;
      query += ` AND t.type = $${paramCount}`;
      queryParams.push(type);
    }

    if (category_id) {
      paramCount++;
      query += ` AND t.category_id = $${paramCount}`;
      queryParams.push(category_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND t.date >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND t.date <= $${paramCount}`;
      queryParams.push(end_date);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE user_id = $1';
    const countParams = [req.user.id];
    let countParamCount = 1;

    if (type) {
      countParamCount++;
      countQuery += ` AND type = $${countParamCount}`;
      countParams.push(type);
    }

    if (category_id) {
      countParamCount++;
      countQuery += ` AND category_id = $${countParamCount}`;
      countParams.push(category_id);
    }

    if (start_date) {
      countParamCount++;
      countQuery += ` AND date >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND date <= $${countParamCount}`;
      countParams.push(end_date);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      transactions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, description, date, type, category_id } = req.body;

    // Validate input
    if (!amount || !date || !type) {
      return res.status(400).json({ message: 'Amount, date, and type are required' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type must be either income or expense' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    // Verify category belongs to user if provided
    if (category_id) {
      const categoryResult = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, req.user.id]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid category' });
      }
    }

    const result = await pool.query(
      'INSERT INTO transactions (user_id, category_id, amount, description, date, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, category_id || null, amount, description || '', date, type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, date, type, category_id } = req.body;

    // Check if transaction exists and belongs to user
    const existingTransaction = await pool.query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Validate input
    if (amount && amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    if (type && type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type must be either income or expense' });
    }

    // Verify category belongs to user if provided
    if (category_id) {
      const categoryResult = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, req.user.id]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid category' });
      }
    }

    const result = await pool.query(
      'UPDATE transactions SET amount = COALESCE($1, amount), description = COALESCE($2, description), date = COALESCE($3, date), type = COALESCE($4, type), category_id = COALESCE($5, category_id) WHERE id = $6 AND user_id = $7 RETURNING *',
      [amount, description, date, type, category_id, id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
