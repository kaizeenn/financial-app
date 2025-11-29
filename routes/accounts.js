const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper function untuk format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// GET daftar akun
router.get('/', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user_id;

    const [accounts] = await db.query(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY name',
      [userId]
    );

    // Get total income and expense for current month
    const [incomeResult] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as totalIncome FROM income WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
      [userId]
    );

    const [expenseResult] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as totalExpense FROM expense WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
      [userId]
    );

    res.render('user/accounts/index', {
      accounts,
      totalIncome: incomeResult[0]?.totalIncome || 0,
      totalExpense: expenseResult[0]?.totalExpense || 0,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Accounts error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat daftar akun',
      error
    });
  }
});

// POST tambah akun baru
router.post('/', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user_id;
    const { name, balance } = req.body;

    if (!name || balance === undefined) {
      const [accounts] = await db.query(
        'SELECT * FROM accounts WHERE user_id = ? ORDER BY name',
        [userId]
      );

      // Get total income and expense for current month
      const [incomeResult] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as totalIncome FROM income WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
        [userId]
      );

      const [expenseResult] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as totalExpense FROM expense WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
        [userId]
      );

      return res.render('user/accounts/index', {
        accounts,
        totalIncome: incomeResult[0]?.totalIncome || 0,
        totalExpense: expenseResult[0]?.totalExpense || 0,
        error: 'Nama dan saldo harus diisi',
        success: null
      });
    }

    const [existing] = await db.query(
      'SELECT * FROM accounts WHERE name = ? AND user_id = ?',
      [name, userId]
    );

    if (existing.length > 0) {
      const [accounts] = await db.query(
        'SELECT * FROM accounts WHERE user_id = ? ORDER BY name',
        [userId]
      );

      // Get total income and expense for current month
      const [incomeResult] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as totalIncome FROM income WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
        [userId]
      );

      const [expenseResult] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as totalExpense FROM expense WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
        [userId]
      );

      return res.render('user/accounts/index', {
        accounts,
        totalIncome: incomeResult[0]?.totalIncome || 0,
        totalExpense: expenseResult[0]?.totalExpense || 0,
        error: 'Nama akun sudah digunakan',
        success: null
      });
    }

    await db.query(
      'INSERT INTO accounts (name, balance, user_id) VALUES (?, ?, ?)',
      [name, balance, userId]
    );

    const [accounts] = await db.query(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY name',
      [userId]
    );

    // Get total income and expense for current month
    const [incomeResult] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as totalIncome FROM income WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
      [userId]
    );

    const [expenseResult] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as totalExpense FROM expense WHERE user_id = ? AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())',
      [userId]
    );

    res.render('user/accounts/index', {
      accounts,
      totalIncome: incomeResult[0]?.totalIncome || 0,
      totalExpense: expenseResult[0]?.totalExpense || 0,
      error: null,
      success: 'Akun berhasil ditambahkan'
    });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat menambah akun',
      error
    });
  }
});

// DELETE hapus akun
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.session.user_id;
    const accountId = req.params.id;

    const [incomeUsage] = await db.query(
      'SELECT COUNT(*) as count FROM income WHERE account_id = ? AND user_id = ?',
      [accountId, userId]
    );

    const [expenseUsage] = await db.query(
      'SELECT COUNT(*) as count FROM expense WHERE account_id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (incomeUsage[0].count > 0 || expenseUsage[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Akun tidak dapat dihapus karena masih digunakan dalam transaksi'
      });
    }

    await db.query(
      'DELETE FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus akun'
    });
  }
});

module.exports = router;
