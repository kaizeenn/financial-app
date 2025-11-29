const express = require('express');
const router = express.Router();
const db = require('../config/db');
const isAuthenticated = require('../middleware/auth');

// Middleware untuk set main layout
router.use((req, res, next) => {
  res.locals.layout = 'layout/main';
  next();
});

// Get all recurring transactions for user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const username = req.session.username;

    // Fetch recurring transactions
    const [recurring] = await db.query(
      `SELECT rt.*,
              c.name as category_name,
              a.name as account_name
       FROM recurring_transactions rt
       LEFT JOIN categories c ON rt.category_id = c.id
       LEFT JOIN accounts a ON rt.account_id = a.id
       WHERE rt.user_id = ?
       ORDER BY rt.next_run_date ASC`,
      [user_id]
    );

    // Fetch categories and accounts for forms
    const [categories] = await db.query('SELECT * FROM categories WHERE type IN ("income", "expense")');
    const [accounts] = await db.query('SELECT * FROM accounts WHERE user_id = ?', [user_id]);

    res.render('user/recurring/index', {
      title: 'Transaksi Berulang',
      username,
      active: 'recurring',
      recurring,
      categories,
      accounts,
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  } catch (error) {
    console.error('Recurring transactions page error:', error);
    res.status(500).send('Server Error');
  }
});

// Get categories for type
router.get('/categories/:type', isAuthenticated, async (req, res) => {
  try {
    const { type } = req.params;
    const [categories] = await db.query('SELECT * FROM categories WHERE type = ?', [type]);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create new recurring transaction
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { type, category_id, account_id, amount, description, frequency, next_run_date } = req.body;
    const user_id = req.session.user_id;
    const cleanAmount = amount.replace(/[^\d]/g, '');

    await db.query(
      `INSERT INTO recurring_transactions
       (user_id, type, category_id, account_id, amount, description, frequency, next_run_date, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [user_id, type, category_id, account_id, cleanAmount, description, frequency, next_run_date]
    );

    req.flash('success', 'Transaksi berulang berhasil ditambahkan');
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding recurring transaction:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan transaksi berulang.' });
  }
});

// Update recurring transaction
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category_id, account_id, amount, description, frequency, next_run_date, active } = req.body;
    const user_id = req.session.user_id;
    const cleanAmount = amount.replace(/[^\d]/g, '');

    // Verify ownership
    const [recurringCheck] = await db.query('SELECT id FROM recurring_transactions WHERE id = ? AND user_id = ?', [id, user_id]);
    if (recurringCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    await db.query(
      `UPDATE recurring_transactions
       SET type = ?, category_id = ?, account_id = ?, amount = ?, description = ?,
           frequency = ?, next_run_date = ?, active = ?
       WHERE id = ? AND user_id = ?`,
      [type, category_id, account_id, cleanAmount, description, frequency, next_run_date, active, id, user_id]
    );

    req.flash('success', 'Transaksi berulang berhasil diupdate');
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate transaksi berulang.' });
  }
});

// Delete recurring transaction
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.session.user_id;

    // Verify ownership
    const [recurringCheck] = await db.query('SELECT id FROM recurring_transactions WHERE id = ? AND user_id = ?', [id, user_id]);
    if (recurringCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    await db.query('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?', [id, user_id]);

    req.flash('success', 'Transaksi berulang berhasil dihapus');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus transaksi berulang.' });
  }
});

// Toggle active status
router.patch('/:id/toggle', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.session.user_id;

    // Verify ownership
    const [recurringCheck] = await db.query('SELECT id, active FROM recurring_transactions WHERE id = ? AND user_id = ?', [id, user_id]);
    if (recurringCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const newActiveStatus = recurringCheck[0].active ? 0 : 1;

    await db.query(
      'UPDATE recurring_transactions SET active = ? WHERE id = ? AND user_id = ?',
      [newActiveStatus, id, user_id]
    );

    req.flash('success', `Transaksi berulang ${newActiveStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
    res.json({ success: true, active: newActiveStatus });
  } catch (error) {
    console.error('Error toggling recurring transaction:', error);
    res.status(500).json({ success: false, message: 'Gagal mengubah status transaksi berulang.' });
  }
});

module.exports = router;
