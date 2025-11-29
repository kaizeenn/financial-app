const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const roleMiddleware = require('../middleware/role');
// Helper: update debt status after payment changes
async function updateDebtStatus(db, debtId) {
  try {
    const [paymentResult] = await db.query(
      'SELECT SUM(amount) as total_paid FROM debt_payments WHERE debt_id = ?',
      [debtId]
    );
    const totalPaid = paymentResult[0].total_paid || 0;

    const [debtResult] = await db.query(
      'SELECT amount, due_date, last_payment_date FROM debts WHERE id = ?',
      [debtId]
    );
    if (debtResult.length === 0) return;

    const debt = debtResult[0];
    const remainingAmount = debt.amount - totalPaid;
    let status = 'pending';
    if (remainingAmount <= 0) status = 'paid';
    else if (remainingAmount < debt.amount) status = 'partial';

    if (debt.due_date && remainingAmount > 0) {
      const today = new Date();
      const dueDate = new Date(debt.due_date);
      if (today > dueDate) status = 'overdue';
    }

    await db.query(
      'UPDATE debts SET paid_amount = ?, status = ?, last_payment_date = ? WHERE id = ?',
      [totalPaid, status, debt.last_payment_date, debtId]
    );
  } catch (err) {
    console.error('Admin updateDebtStatus error:', err);
  }
}

// Middleware untuk admin
router.use(roleMiddleware(1));

// Middleware untuk set admin layout
router.use((req, res, next) => {
  res.locals.layout = 'layout/admin';
  next();
});

// GET admin dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Get total users
    const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users');

    // Get total categories
    const [totalCategories] = await db.query('SELECT COUNT(*) as count FROM categories');

    // Get total payment methods
    const [totalPaymentMethods] = await db.query('SELECT COUNT(*) as count FROM payment_methods');

    // Get recent users
    const [recentUsers] = await db.query(
      'SELECT id, username, email, level, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );

    res.render('admin/dashboard', {
      title: 'Dashboard',
      totalUsers: totalUsers[0].count,
      totalCategories: totalCategories[0].count,
      totalPaymentMethods: totalPaymentMethods[0].count,
      recentUsers,
      active: 'dashboard'
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat dashboard admin',
      error
    });
  }
});

// GET users management
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, email, level, created_at FROM users ORDER BY created_at DESC'
    );

    res.render('admin/users', {
      title: 'Kelola User',
      users,
      active: 'users'
    });
  } catch (error) {
    console.error('Users management error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat data user',
      error
    });
  }
});

// POST add user
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, level } = req.body;

    // Validate input
    if (!username || !email || !password || !level) {
      return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
    }

    // Check if username or email already exists
    const [existing] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username atau email sudah digunakan' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db.query(
      'INSERT INTO users (username, email, password, level, created_at) VALUES (?, ?, ?, ?, NOW())',
      [username, email, hashedPassword, level]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menambah user' });
  }
});

// PUT update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, level } = req.body;

    // Validate input
    if (!username || !email || !level) {
      return res.status(400).json({ success: false, message: 'Username, email, dan level harus diisi' });
    }

    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    // Check if username or email already exists (excluding current user)
    const [duplicate] = await db.query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, id]
    );

    if (duplicate.length > 0) {
      return res.status(400).json({ success: false, message: 'Username atau email sudah digunakan' });
    }

    // Update user
    if (password) {
      // Update with new password
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET username = ?, email = ?, password = ?, level = ? WHERE id = ?',
        [username, email, hashedPassword, level, id]
      );
    } else {
      // Update without password
      await db.query(
        'UPDATE users SET username = ?, email = ?, level = ? WHERE id = ?',
        [username, email, level, id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengupdate user' });
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.user_id;

    // Prevent admin from deleting themselves
    if (parseInt(id) === currentUserId) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun sendiri' });
    }

    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    // Delete user
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus user' });
  }
});

// GET categories management
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY type, name');

    res.render('admin/categories', {
      title: 'Kelola Kategori',
      categories,
      active: 'categories'
    });
  } catch (error) {
    console.error('Categories management error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat data kategori',
      error
    });
  }
});

// POST add category
router.post('/categories', async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Nama dan tipe kategori harus diisi' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Tipe kategori tidak valid' });
    }

    await db.query('INSERT INTO categories (name, type) VALUES (?, ?)', [name, type]);
    res.json({ success: true });
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menambah kategori' });
  }
});

// PUT update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Nama dan tipe kategori harus diisi' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Tipe kategori tidak valid' });
    }

    await db.query('UPDATE categories SET name = ?, type = ? WHERE id = ?', [name, type, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengupdate kategori' });
  }
});

// DELETE category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus kategori' });
  }
});

// GET payment methods management
router.get('/payment-methods', async (req, res) => {
  try {
    const [paymentMethods] = await db.query('SELECT * FROM payment_methods ORDER BY method_name');

    res.render('admin/payment-methods', {
      title: 'Kelola Metode Pembayaran',
      paymentMethods,
      active: 'payment-methods'
    });
  } catch (error) {
    console.error('Payment methods management error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat data metode pembayaran',
      error
    });
  }
});

// POST add payment method
router.post('/payment-methods', async (req, res) => {
  try {
    const { method_name } = req.body;

    if (!method_name) {
      return res.status(400).json({ success: false, message: 'Nama metode pembayaran harus diisi' });
    }

    await db.query('INSERT INTO payment_methods (method_name) VALUES (?)', [method_name]);
    res.json({ success: true });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menambah metode pembayaran' });
  }
});

// PUT update payment method
router.put('/payment-methods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { method_name } = req.body;

    if (!method_name) {
      return res.status(400).json({ success: false, message: 'Nama metode pembayaran harus diisi' });
    }

    await db.query('UPDATE payment_methods SET method_name = ? WHERE id = ?', [method_name, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengupdate metode pembayaran' });
  }
});

// DELETE payment method
router.delete('/payment-methods/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM payment_methods WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus metode pembayaran' });
  }
});

// =====================
// Debt Categories (Admin)
// =====================
router.get('/debt-categories', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM debt_categories ORDER BY name');
    res.render('admin/debt-categories', {
      title: 'Kategori Hutang',
      items,
      active: 'debt-categories'
    });
  } catch (error) {
    console.error('Debt categories error:', error);
    res.status(500).render('error', { message: 'Gagal memuat kategori hutang', error });
  }
});

router.post('/debt-categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    await db.query('INSERT INTO debt_categories (name) VALUES (?)', [name]);
    res.json({ success: true });
  } catch (error) {
    console.error('Add debt category error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambah kategori' });
  }
});

router.put('/debt-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    await db.query('UPDATE debt_categories SET name = ? WHERE id = ?', [name, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update debt category error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate kategori' });
  }
});

router.delete('/debt-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM debt_categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete debt category error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori' });
  }
});

// =====================
// Credit Categories (Admin)
// =====================
router.get('/credit-categories', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM credit_categories ORDER BY name');
    res.render('admin/credit-categories', {
      title: 'Kategori Piutang',
      items,
      active: 'credit-categories'
    });
  } catch (error) {
    console.error('Credit categories error:', error);
    res.status(500).render('error', { message: 'Gagal memuat kategori piutang', error });
  }
});

router.post('/credit-categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    await db.query('INSERT INTO credit_categories (name) VALUES (?)', [name]);
    res.json({ success: true });
  } catch (error) {
    console.error('Add credit category error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambah kategori' });
  }
});

router.put('/credit-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    await db.query('UPDATE credit_categories SET name = ? WHERE id = ?', [name, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update credit category error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate kategori' });
  }
});

router.delete('/credit-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM credit_categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete credit category error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori' });
  }
});

// =====================
// Debt Payments (Admin)
// =====================
router.get('/debt-payments', async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT dp.id, dp.debt_id, dp.amount, dp.payment_date, dp.account_id,
              d.creditor_debtor_name, d.type,
              a.name AS account_name
       FROM debt_payments dp
       LEFT JOIN debts d ON dp.debt_id = d.id
       LEFT JOIN accounts a ON dp.account_id = a.id
       ORDER BY dp.payment_date DESC, dp.id DESC`
    );
    const [debts] = await db.query('SELECT id, creditor_debtor_name, type FROM debts ORDER BY id DESC');
    const [accounts] = await db.query('SELECT id, name FROM accounts ORDER BY name');
    res.render('admin/debt-payments', {
      title: 'Pembayaran Hutang/Piutang',
      payments,
      debts,
      accounts,
      active: 'debt-payments'
    });
  } catch (error) {
    console.error('Debt payments error:', error);
    res.status(500).render('error', { message: 'Gagal memuat pembayaran', error });
  }
});

router.post('/debt-payments', async (req, res) => {
  try {
    const { debt_id, amount, payment_date, account_id } = req.body;
    if (!debt_id || !amount || !payment_date) {
      return res.status(400).json({ success: false, message: 'debt, jumlah, dan tanggal wajib diisi' });
    }
    const cleanAmount = String(amount).replace(/[^\d]/g, '');
    await db.query(
      'INSERT INTO debt_payments (debt_id, amount, payment_date, account_id) VALUES (?, ?, ?, ?)',
      [debt_id, cleanAmount, payment_date, account_id || null]
    );
    await updateDebtStatus(db, debt_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Add debt payment error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambah pembayaran' });
  }
});

router.put('/debt-payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { debt_id, amount, payment_date, account_id } = req.body;
    if (!debt_id || !amount || !payment_date) {
      return res.status(400).json({ success: false, message: 'debt, jumlah, dan tanggal wajib diisi' });
    }
    const cleanAmount = String(amount).replace(/[^\d]/g, '');
    await db.query(
      'UPDATE debt_payments SET debt_id = ?, amount = ?, payment_date = ?, account_id = ? WHERE id = ?',
      [debt_id, cleanAmount, payment_date, account_id || null, id]
    );
    await updateDebtStatus(db, debt_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Update debt payment error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate pembayaran' });
  }
});

router.delete('/debt-payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Get debt id before delete so we can recalc
    const [rows] = await db.query('SELECT debt_id FROM debt_payments WHERE id = ?', [id]);
    await db.query('DELETE FROM debt_payments WHERE id = ?', [id]);
    if (rows.length) await updateDebtStatus(db, rows[0].debt_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete debt payment error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus pembayaran' });
  }
});

module.exports = router;
