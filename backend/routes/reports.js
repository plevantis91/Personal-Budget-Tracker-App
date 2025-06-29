const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Get monthly summary
router.get('/monthly-summary', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || (currentDate.getMonth() + 1);

    // Get income and expense totals
    const summaryResult = await pool.query(
      `SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = $1 
        AND EXTRACT(YEAR FROM date) = $2 
        AND EXTRACT(MONTH FROM date) = $3
      GROUP BY type`,
      [req.user.id, targetYear, targetMonth]
    );

    // Get category breakdown
    const categoryBreakdown = await pool.query(
      `SELECT 
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        t.type,
        SUM(t.amount) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND EXTRACT(YEAR FROM t.date) = $2 
        AND EXTRACT(MONTH FROM t.date) = $3
      GROUP BY c.name, c.color, c.icon, t.type
      ORDER BY total DESC`,
      [req.user.id, targetYear, targetMonth]
    );

    // Get daily spending for the month
    const dailySpending = await pool.query(
      `SELECT 
        date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions 
      WHERE user_id = $1 
        AND EXTRACT(YEAR FROM date) = $2 
        AND EXTRACT(MONTH FROM date) = $3
      GROUP BY date
      ORDER BY date`,
      [req.user.id, targetYear, targetMonth]
    );

    const summary = {
      income: 0,
      expense: 0,
      net: 0,
      incomeCount: 0,
      expenseCount: 0
    };

    summaryResult.rows.forEach(row => {
      if (row.type === 'income') {
        summary.income = parseFloat(row.total);
        summary.incomeCount = parseInt(row.count);
      } else {
        summary.expense = parseFloat(row.total);
        summary.expenseCount = parseInt(row.count);
      }
    });

    summary.net = summary.income - summary.expense;

    res.json({
      summary,
      categoryBreakdown: categoryBreakdown.rows,
      dailySpending: dailySpending.rows,
      period: { year: targetYear, month: targetMonth }
    });
  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get spending trends
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const trendsResult = await pool.query(
      `SELECT 
        EXTRACT(YEAR FROM date) as year,
        EXTRACT(MONTH FROM date) as month,
        type,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = $1 
        AND date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), type
      ORDER BY year, month`,
      [req.user.id]
    );

    // Organize data by month
    const trends = {};
    trendsResult.rows.forEach(row => {
      const key = `${row.year}-${row.month.toString().padStart(2, '0')}`;
      if (!trends[key]) {
        trends[key] = { income: 0, expense: 0 };
      }
      trends[key][row.type] = parseFloat(row.total);
    });

    res.json({ trends });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export transactions as CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;

    let query = `
      SELECT 
        t.date,
        t.type,
        t.amount,
        t.description,
        c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const queryParams = [req.user.id];
    let paramCount = 1;

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

    if (type) {
      paramCount++;
      query += ` AND t.type = $${paramCount}`;
      queryParams.push(type);
    }

    query += ' ORDER BY t.date DESC';

    const result = await pool.query(query, queryParams);

    // Generate CSV
    const csvHeader = 'Date,Type,Amount,Description,Category\n';
    const csvRows = result.rows.map(row => 
      `"${row.date}","${row.type}","${row.amount}","${row.description || ''}","${row.category_name || ''}"`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export transactions as PDF
router.get('/export/pdf', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;

    let query = `
      SELECT 
        t.date,
        t.type,
        t.amount,
        t.description,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const queryParams = [req.user.id];
    let paramCount = 1;

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

    if (type) {
      paramCount++;
      query += ` AND t.type = $${paramCount}`;
      queryParams.push(type);
    }

    query += ' ORDER BY t.date DESC';

    const result = await pool.query(query, queryParams);

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaction Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .income { color: #10B981; }
          .expense { color: #EF4444; }
          .summary { margin-top: 30px; padding: 20px; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Transaction Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <p>Period: ${start_date || 'All time'} to ${end_date || 'Present'}</p>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            ${result.rows.map(row => `
              <tr>
                <td>${row.date}</td>
                <td class="${row.type}">${row.type}</td>
                <td class="${row.type}">$${parseFloat(row.amount).toFixed(2)}</td>
                <td>${row.description || ''}</td>
                <td>${row.category_name || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h2>Summary</h2>
          <p>Total Transactions: ${result.rows.length}</p>
          <p>Total Income: $${result.rows.filter(r => r.type === 'income').reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)}</p>
          <p>Total Expenses: $${result.rows.filter(r => r.type === 'expense').reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)}</p>
        </div>
      </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');
    res.send(pdf);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
