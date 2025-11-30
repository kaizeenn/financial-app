const express = require('express');
const router = express.Router();
const db = require('../config/db');
const roleMiddleware = require('../middleware/role');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Helper function untuk format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// Fungsi untuk membangun kondisi filter tanggal, kategori, dan pencarian
function buildFilterConditions(startDate, endDate, categoryId, search) {
  let conditions = [];
  let params = [];

  // Validasi startDate dan endDate harus tanggal valid dan tidak kosong
  if (startDate && !isNaN(Date.parse(startDate))) {
    conditions.push('entry_date >= ?');
    params.push(startDate);
  }
  if (endDate && !isNaN(Date.parse(endDate))) {
    conditions.push('entry_date <= ?');
    params.push(endDate);
  }
  if (categoryId) {
    conditions.push('category_id = ?');
    params.push(categoryId);
  }
  if (search) {
    conditions.push('description LIKE ?');
    params.push(`%${search}%`);
  }

  // Gabungkan kondisi dengan AND
  const whereClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';

  return { whereClause, params };
}

// Middleware untuk user biasa
router.use(roleMiddleware(2));

// Middleware untuk set main layout (tidak ada layout user terpisah)
router.use((req, res, next) => {
  res.locals.layout = 'layout/main';
  next();
});

const { fetchPrice, fetchPrices } = require('../services/cryptoPriceService');

// GET user dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const period = req.query.period || 'monthly'; // default monthly

    // Determine date filter based on period
    let dateFilterIncome = '';
    let dateFilterExpense = '';
    if (period === 'yearly') {
      dateFilterIncome = `AND YEAR(entry_date) = YEAR(CURDATE())`;
      dateFilterExpense = `AND YEAR(entry_date) = YEAR(CURDATE())`;
    } else {
      // monthly
      dateFilterIncome = `AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())`;
      dateFilterExpense = `AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())`;
    }

    // Get total balance from accounts
    const [accounts] = await db.query(
      'SELECT SUM(balance) as totalBalance FROM accounts WHERE user_id = ?',
      [userId]
    );

    // Get total income and expense for selected period
    const [totals] = await db.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)
         FROM income
         WHERE user_id = ?
         ${dateFilterIncome}) as totalIncome,
        (SELECT COALESCE(SUM(amount), 0)
         FROM expense
         WHERE user_id = ?
         ${dateFilterExpense}) as totalExpense`,
      [userId, userId]
    );

    // Get data for chart based on selected period
    let monthlyDataQuery = '';
    let monthlyDataParams = [userId, userId];

    if (period === 'yearly') {
      monthlyDataQuery = `
        SELECT
          DATE_FORMAT(entry_date, '%b %Y') as period,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM (
          SELECT entry_date, amount, 'income' as type FROM income WHERE user_id = ?
          UNION ALL
          SELECT entry_date, amount, 'expense' as type FROM expense WHERE user_id = ?
        ) t
        WHERE YEAR(entry_date) = YEAR(CURDATE())
        GROUP BY DATE_FORMAT(entry_date, '%b %Y'), entry_date
        ORDER BY entry_date
      `;
    } else {
      // monthly
      monthlyDataQuery = `
        SELECT
          DATE_FORMAT(entry_date, '%d %b') as period,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM (
          SELECT entry_date, amount, 'income' as type FROM income WHERE user_id = ?
          UNION ALL
          SELECT entry_date, amount, 'expense' as type FROM expense WHERE user_id = ?
        ) t
        WHERE MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())
        GROUP BY DATE_FORMAT(entry_date, '%d %b'), entry_date
        ORDER BY entry_date
      `;
    }

    const [monthlyData] = await db.query(monthlyDataQuery, monthlyDataParams);

    // Ambil semua kategori pengeluaran dari database
    const [expenseCategories] = await db.query(
      "SELECT id, name FROM categories WHERE type = 'expense' ORDER BY name"
    );

    let categoryTotalsQuery = '';
    let categoryTotalsParams = [userId];

    if (period === 'yearly') {
      categoryTotalsQuery = `
        SELECT
          category_id,
          SUM(amount) as total
        FROM expense
        WHERE user_id = ?
          AND YEAR(entry_date) = YEAR(CURDATE())
        GROUP BY category_id
      `;
    } else {
      // monthly
      categoryTotalsQuery = `
        SELECT
          category_id,
          SUM(amount) as total
        FROM expense
        WHERE user_id = ?
          AND MONTH(entry_date) = MONTH(CURRENT_DATE())
          AND YEAR(entry_date) = YEAR(CURRENT_DATE())
        GROUP BY category_id
      `;
    }

    const [categoryTotals] = await db.query(categoryTotalsQuery, categoryTotalsParams);

    // Map totals to category names dari database
    const categoryData = expenseCategories.map(cat => {
      const total = categoryTotals.find(t => t.category_id === cat.id);
      return {
        name: cat.name,
        total: total ? parseFloat(total.total) : 0
      };
    }).filter(cat => cat.total > 0);

    // Compute total crypto value (IDR) using real-time prices
    let totalCryptoValueIdr = 0;
    const [cryptoAssets] = await db.query(
      `SELECT ca.amount, cl.coingecko_id
       FROM crypto_assets ca
       JOIN crypto_list cl ON ca.crypto_id = cl.id
       WHERE ca.user_id = ?`,
      [userId]
    );
    if (cryptoAssets.length > 0) {
      const uniqueCoins = [...new Set(cryptoAssets.map(a => a.coingecko_id))];
      const priceMapFull = await fetchPrices(uniqueCoins);
      totalCryptoValueIdr = cryptoAssets.reduce((sum, a) => {
        const p = priceMapFull[a.coingecko_id];
        const idr = p ? Number(p.idr || 0) : 0;
        return sum + Number(a.amount) * idr;
      }, 0);
    }

    // Format data for charts
    const monthlyDataReversed = [...monthlyData].reverse();
    const chartData = {
      labels: monthlyDataReversed.map(d => d.period),
      incomeData: monthlyDataReversed.map(d => parseFloat(d.income)),
      expenseData: monthlyDataReversed.map(d => parseFloat(d.expense)),
      categoryLabels: categoryData.map(c => c.name),
      categoryData: categoryData.map(c => c.total)
    };

    console.log('Dashboard categoryLabels:', JSON.stringify(chartData.categoryLabels));
    console.log('Dashboard categoryData:', JSON.stringify(chartData.categoryData));

    res.render('user/dashboard/index', {
      title: 'Dashboard',
      username,
      period,  // pass period to view for dropdown selection
      totalBalance: accounts[0]?.totalBalance || 0,
      totalIncome: totals[0]?.totalIncome || 0,
      totalExpense: totals[0]?.totalExpense || 0,
      totalCryptoValueIdr,
      chartLabels: JSON.stringify(chartData.labels),
      incomeData: JSON.stringify(chartData.incomeData),
      expenseData: JSON.stringify(chartData.expenseData),
      categoryLabels: JSON.stringify(chartData.categoryLabels),
      categoryData: JSON.stringify(chartData.categoryData),
      active: 'dashboard'
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat dashboard',
      error
    });
  }
});

// GET user accounts
router.get('/accounts', async (req, res) => {
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
    const [monthlyTotals] = await db.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)
         FROM income
         WHERE user_id = ?
         AND MONTH(entry_date) = MONTH(CURRENT_DATE())
         AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalIncome,
        (SELECT COALESCE(SUM(amount), 0)
         FROM expense
         WHERE user_id = ?
         AND MONTH(entry_date) = MONTH(CURRENT_DATE())
         AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalExpense`,
      [userId, userId]
    );

    const username = req.session.username;
    res.render('user/accounts/index', {
      username,
      accounts,
      totalIncome: monthlyTotals[0]?.totalIncome || 0,
      totalExpense: monthlyTotals[0]?.totalExpense || 0,
      error: null,
      success: null,
      active: 'accounts'
    });
  } catch (error) {
    console.error('User accounts error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat daftar akun',
      error
    });
  }
});

// POST add user account
router.post('/accounts', async (req, res) => {
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
      const [monthlyTotals] = await db.query(
        `SELECT
          (SELECT COALESCE(SUM(amount), 0)
           FROM income
           WHERE user_id = ?
           AND MONTH(entry_date) = MONTH(CURRENT_DATE())
           AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalIncome,
          (SELECT COALESCE(SUM(amount), 0)
           FROM expense
           WHERE user_id = ?
           AND MONTH(entry_date) = MONTH(CURRENT_DATE())
           AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalExpense`,
        [userId, userId]
      );

      const username = req.session.username;
      return res.render('user/accounts/index', {
        username,
        accounts,
        totalIncome: monthlyTotals[0]?.totalIncome || 0,
        totalExpense: monthlyTotals[0]?.totalExpense || 0,
        error: 'Nama dan saldo harus diisi',
        success: null,
        active: 'accounts'
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
      const [monthlyTotals] = await db.query(
        `SELECT
          (SELECT COALESCE(SUM(amount), 0)
           FROM income
           WHERE user_id = ?
           AND MONTH(entry_date) = MONTH(CURRENT_DATE())
           AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalIncome,
          (SELECT COALESCE(SUM(amount), 0)
           FROM expense
           WHERE user_id = ?
           AND MONTH(entry_date) = MONTH(CURRENT_DATE())
           AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalExpense`,
        [userId, userId]
      );

      const username = req.session.username;
      return res.render('user/accounts/index', {
        username,
        accounts,
        totalIncome: monthlyTotals[0]?.totalIncome || 0,
        totalExpense: monthlyTotals[0]?.totalExpense || 0,
        error: 'Nama akun sudah digunakan',
        success: null,
        active: 'accounts'
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
    const [monthlyTotals] = await db.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)
         FROM income
         WHERE user_id = ?
         AND MONTH(entry_date) = MONTH(CURRENT_DATE())
         AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalIncome,
        (SELECT COALESCE(SUM(amount), 0)
         FROM expense
         WHERE user_id = ?
         AND MONTH(entry_date) = MONTH(CURRENT_DATE())
         AND YEAR(entry_date) = YEAR(CURRENT_DATE())) as totalExpense`,
      [userId, userId]
    );

    const username = req.session.username;
    res.render('user/accounts/index', {
      username,
      accounts,
      totalIncome: monthlyTotals[0]?.totalIncome || 0,
      totalExpense: monthlyTotals[0]?.totalExpense || 0,
      error: null,
      success: 'Akun berhasil ditambahkan',
      active: 'accounts'
    });
  } catch (error) {
    console.error('Add user account error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat menambah akun',
      error
    });
  }
});

// DELETE user account
router.delete('/accounts/:id', async (req, res) => {
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
    console.error('Delete user account error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus akun'
    });
  }
});

// DELETE user payment method
router.delete('/payment-methods/:id', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.session.user_id;
    const methodId = req.params.id;

    await db.query(
      'DELETE FROM payment_methods WHERE id = ?',
      [methodId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus metode pembayaran'
    });
  }
});

// GET user categories
router.get('/categories', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    // Ambil semua kategori (hapus filter is_active)
    const [categories] = await db.query(
      'SELECT * FROM categories ORDER BY type, name'
    );

    res.render('user/categories/index', {
      categories,
      error: null,
      success: null,
      active: 'categories'
    });
  } catch (error) {
    console.error('User categories error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat daftar kategori',
      error
    });
  }
});

// POST add user category
router.post('/categories', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const { name, type } = req.body;

    if (!name || !type) {
      const [categories] = await db.query(
        'SELECT * FROM categories ORDER BY type, name'
      );
      return res.render('user/categories/index', {
        categories,
        error: 'Nama dan tipe kategori harus diisi',
        success: null,
        active: 'categories'
      });
    }

    // Cek apakah kategori sudah ada
    const [existing] = await db.query(
      'SELECT * FROM categories WHERE name = ? AND type = ?',
      [name, type]
    );

    if (existing.length > 0) {
      const [categories] = await db.query(
        'SELECT * FROM categories ORDER BY type, name'
      );
      return res.render('user/categories/index', {
        categories,
        error: 'Kategori sudah ada',
        success: null,
        active: 'categories'
      });
    }

    // Tambah kategori baru (hapus kolom is_active)
    await db.query(
      'INSERT INTO categories (name, type) VALUES (?, ?)',
      [name, type]
    );

    const [categories] = await db.query(
      'SELECT * FROM categories ORDER BY type, name'
    );
    res.render('user/categories/index', {
      categories,
      error: null,
      success: 'Kategori berhasil ditambahkan',
      active: 'categories'
    });
  } catch (error) {
    console.error('Add user category error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat menambah kategori',
      error
    });
  }
});

// DELETE user category
router.delete('/categories/:id', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const categoryId = req.params.id;

    // Cek apakah kategori digunakan dalam transaksi
    const [incomeUsage] = await db.query(
      'SELECT COUNT(*) as count FROM income WHERE category_id = ?',
      [categoryId]
    );

    const [expenseUsage] = await db.query(
      'SELECT COUNT(*) as count FROM expense WHERE category_id = ?',
      [categoryId]
    );

    if (incomeUsage[0].count > 0 || expenseUsage[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kategori tidak dapat dihapus karena masih digunakan dalam transaksi'
      });
    }

    // Hapus kategori
    await db.query('DELETE FROM categories WHERE id = ?', [categoryId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user category error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus kategori'
    });
  }
});

// GET user payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user_id;
    const [methods] = await db.query(
      'SELECT * FROM payment_methods ORDER BY method_name'
    );

    res.render('user/payment-methods/index', {
      methods,
      error: null,
      success: null,
      active: 'payment-methods'
    });
  } catch (error) {
    console.error('User payment methods error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat metode pembayaran',
      error
    });
  }
});

// POST add user payment method
router.post('/payment-methods', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user_id;
    const { method_name, details } = req.body;

    // Validate input
    if (!method_name) {
      throw new Error('Nama metode pembayaran harus diisi');
    }

    // Check for duplicate
    const [existing] = await db.query(
      'SELECT * FROM payment_methods WHERE method_name = ?',
      [method_name]
    );

    if (existing.length > 0) {
      throw new Error('Metode pembayaran dengan nama tersebut sudah ada');
    }

    // Add new payment method
    await db.query(
      'INSERT INTO payment_methods (method_name, details) VALUES (?, ?)',
      [method_name, details]
    );

    // Get updated list
    const [methods] = await db.query(
      'SELECT * FROM payment_methods ORDER BY method_name'
    );

    res.render('user/payment-methods/index', {
      methods,
      error: null,
      success: 'Metode pembayaran berhasil ditambahkan',
      active: 'payment-methods'
    });
  } catch (error) {
    console.error('Add user payment method error:', error);
    
    const [methods] = await db.query(
      'SELECT * FROM payment_methods ORDER BY method_name'
    );

    res.status(400).render('user/payment-methods/index', {
      methods,
      error: error.message || 'Terjadi kesalahan saat menambah metode pembayaran',
      success: null,
      active: 'payment-methods'
    });
  }
});

// GET user profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const [user] = await db.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [req.session.user_id]
    );

    res.render('user/profile/index', {
      title: 'Profil Pengguna',
      username: req.session.username,
      user: user[0],
      success: req.flash('success'),
      error: req.flash('error'),
      active: 'profile'
    });
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat profil',
      error
    });
  }
});

// POST update user email
router.post('/profile/email', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const { email } = req.body;

    // Validasi email
    if (!email || !email.includes('@')) {
      req.flash('error', 'Email tidak valid');
      return res.redirect('/user/profile');
    }

    // Cek apakah email sudah digunakan
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.session.user_id]
    );

    if (existing.length > 0) {
      req.flash('error', 'Email sudah digunakan');
      return res.redirect('/user/profile');
    }

    // Update email
    await db.query(
      'UPDATE users SET email = ? WHERE id = ?',
      [email, req.session.user_id]
    );

    req.flash('success', 'Email berhasil diperbarui');
    res.redirect('/user/profile');
  } catch (error) {
    console.error('Update user email error:', error);
    req.flash('error', 'Terjadi kesalahan saat memperbarui email');
    res.redirect('/user/profile');
  }
});

// POST update user password
router.post('/profile/password', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const { current_password, new_password, confirm_password } = req.body;

    // Validasi password
    if (!current_password || !new_password || !confirm_password) {
      req.flash('error', 'Semua field password harus diisi');
      return res.redirect('/user/profile');
    }

    if (new_password !== confirm_password) {
      req.flash('error', 'Password baru tidak cocok dengan konfirmasi');
      return res.redirect('/user/profile');
    }

    if (new_password.length < 6) {
      req.flash('error', 'Password baru minimal 6 karakter');
      return res.redirect('/user/profile');
    }

    // Cek password lama
    const [user] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [req.session.user_id]
    );

    const isMatch = await bcrypt.compare(current_password, user[0].password);
    if (!isMatch) {
      req.flash('error', 'Password saat ini tidak sesuai');
      return res.redirect('/user/profile');
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.session.user_id]
    );

    req.flash('success', 'Password berhasil diperbarui');
    res.redirect('/user/profile');
  } catch (error) {
    console.error('Update user password error:', error);
    req.flash('error', 'Terjadi kesalahan saat memperbarui password');
    res.redirect('/user/profile');
  }
});

// GET user transactions
router.get('/transactions', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user_id;
    const username = req.session.username;
    const type = req.query.type || 'all'; // Filter: all, income, expense
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const categoryId = req.query.category_id || null;
    const search = req.query.search || null;

    // Ambil daftar akun, kategori, dan metode pembayaran untuk form tambah transaksi
    const [accounts] = await db.query(
      "SELECT id, name, balance FROM accounts WHERE user_id = ? ORDER BY name",
      [userId]
    );

    // Ambil kategori
    const [categories] = await db.query(
      "SELECT id, name, type FROM categories ORDER BY type, name"
    );

    // Ambil metode pembayaran
    const [paymentMethods] = await db.query(
      "SELECT id, method_name FROM payment_methods ORDER BY method_name"
    );

    let transactions = [];
    if (type === 'income') {
      // Ambil hanya pemasukan dengan filter
      const { whereClause, params } = buildFilterConditions(startDate, endDate, categoryId, search);
      const [incomeData] = await db.query(
        `SELECT
          i.*,
          a.name as account_name,
          i.payment_method_id
         FROM income i
         LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.user_id = ? ${whereClause}
         ORDER BY i.entry_date DESC, i.created_at DESC`,
        [userId, ...params]
      );
      transactions = incomeData.map(t => ({...t, type: 'income'}));
    }
    else if (type === 'expense') {
      // Ambil hanya pengeluaran dengan filter
      const { whereClause, params } = buildFilterConditions(startDate, endDate, categoryId, search);
      const [expenseData] = await db.query(
        `SELECT
          e.*,
          a.name as account_name,
          e.payment_method_id
         FROM expense e
         LEFT JOIN accounts a ON e.account_id = a.id
         WHERE e.user_id = ? ${whereClause}
         ORDER BY e.entry_date DESC, e.created_at DESC`,
        [userId, ...params]
      );
      transactions = expenseData.map(t => ({...t, type: 'expense'}));
    }
    else {
      // Ambil semua transaksi (pemasukan & pengeluaran) dengan filter
      const { whereClause, params } = buildFilterConditions(startDate, endDate, categoryId, search);
      const [incomeData] = await db.query(
        `SELECT
          i.*,
          a.name as account_name,
          i.payment_method_id,
          'income' as type
         FROM income i
         LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.user_id = ? ${whereClause}`,
        [userId, ...params]
      );

      const [expenseData] = await db.query(
        `SELECT
          e.*,
          a.name as account_name,
          e.payment_method_id,
          'expense' as type
         FROM expense e
         LEFT JOIN accounts a ON e.account_id = a.id
         WHERE e.user_id = ? ${whereClause}`,
        [userId, ...params]
      );

      // Gabung dan urutkan berdasarkan tanggal
      transactions = [...incomeData, ...expenseData]
        .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
    }

    // Join dengan payment_methods untuk mendapatkan nama metode pembayaran
    const transactionsWithMethods = transactions.map(t => ({
      ...t,
      amount: formatCurrency(t.amount),
      payment_method: paymentMethods.find(pm => pm.id === t.payment_method_id)?.method_name || '-'
    }));

    res.render('user/transactions/index', {
      username,
      transactions: transactionsWithMethods,
      accounts,
      categories,
      paymentMethods,
      type,
      startDate,
      endDate,
      categoryId,
      error: null,
      active: 'transactions'
    });
  } catch (error) {
    console.error('User transactions error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat daftar transaksi',
      error
    });
  }
});

// POST add user transaction
router.post('/transactions', async (req, res) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    if (!req.session.user_id) {
      return res.status(401).json({ 
        success: false,
        message: 'Sesi telah berakhir, silakan login kembali',
        redirect: '/auth/login'
      });
    }

    const userId = req.session.user_id;
    const { 
      type, 
      amount: rawAmount, 
      description, 
      account_id,
      payment_method_id,
      entry_date,
      category_id 
    } = req.body;
    
    console.log('Request body:', req.body); // Debug log

    // Validasi input
    if (!type || !rawAmount || !entry_date) {
      throw new Error('Mohon lengkapi data yang diperlukan');
    }

    // Validasi tipe transaksi
    if (!['income', 'expense'].includes(type)) {
      throw new Error('Tipe transaksi tidak valid');
    }

    // Parse amount dari format Indonesia (1.234.567) ke number
    const amount = parseFloat(rawAmount.replace(/\./g, '').replace(/,/g, '.'));
    if (isNaN(amount)) {
      throw new Error('Format jumlah tidak valid');
    }

    // Insert transaksi sesuai jenisnya
    if (type === 'income') {
      await connection.query(
        `INSERT INTO income (
          user_id, account_id, payment_method_id,
          amount, description, entry_date, category_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, account_id || null, payment_method_id || null, amount, description || null, entry_date, category_id || null]
      );

      // Update saldo akun jika akun dipilih
      if (account_id) {
        await connection.query(
          `UPDATE accounts 
           SET balance = balance + ? 
           WHERE id = ? AND user_id = ?`,
          [amount, account_id, userId]
        );
      }
    } 
    else if (type === 'expense') {
      await connection.query(
        `INSERT INTO expense (
          user_id, account_id, payment_method_id,
          amount, description, entry_date, category_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, account_id || null, payment_method_id || null, amount, description || null, entry_date, category_id || null]
      );

      // Update saldo akun jika akun dipilih
      if (account_id) {
        await connection.query(
          `UPDATE accounts 
           SET balance = balance - ? 
           WHERE id = ? AND user_id = ?`,
          [amount, account_id, userId]
        );
      }
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Add user transaction error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat menambah transaksi'
    });
  } finally {
    connection.release();
  }
});

// DELETE user transaction
router.delete('/transactions/:type/:id', async (req, res) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    if (!req.session.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.session.user_id;
    const { type, id } = req.params;

    if (type === 'income') {
      // Ambil data transaksi untuk update saldo
      const [income] = await connection.query(
        'SELECT amount, account_id FROM income WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (income[0]?.account_id) {
        // Kurangi saldo akun
        await connection.query(
          `UPDATE accounts 
           SET balance = balance - ? 
           WHERE id = ? AND user_id = ?`,
          [income[0].amount, income[0].account_id, userId]
        );
      }

      // Hapus transaksi
      await connection.query(
        'DELETE FROM income WHERE id = ? AND user_id = ?',
        [id, userId]
      );
    }
    else if (type === 'expense') {
      // Ambil data transaksi untuk update saldo
      const [expense] = await connection.query(
        'SELECT amount, account_id FROM expense WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (expense[0]?.account_id) {
        // Tambah saldo akun (karena pengeluaran dibatalkan)
        await connection.query(
          `UPDATE accounts 
           SET balance = balance + ? 
           WHERE id = ? AND user_id = ?`,
          [expense[0].amount, expense[0].account_id, userId]
        );
      }

      // Hapus transaksi
      await connection.query(
        'DELETE FROM expense WHERE id = ? AND user_id = ?',
        [id, userId]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Delete user transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus transaksi'
    });
  } finally {
    connection.release();
  }
});

// GET user profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const [user] = await db.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [req.session.user_id]
    );

    res.render('user/profile/index', {
      title: 'Profil Pengguna',
      username: req.session.username,
      user: user[0],
      success: req.flash('success'),
      error: req.flash('error'),
      active: 'profile'
    });
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat profil',
      error
    });
  }
});

// POST update user email
router.post('/profile/email', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const { email } = req.body;

    // Validasi email
    if (!email || !email.includes('@')) {
      req.flash('error', 'Email tidak valid');
      return res.redirect('/user/profile');
    }

    // Cek apakah email sudah digunakan
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.session.user_id]
    );

    if (existing.length > 0) {
      req.flash('error', 'Email sudah digunakan');
      return res.redirect('/user/profile');
    }

    // Update email
    await db.query(
      'UPDATE users SET email = ? WHERE id = ?',
      [email, req.session.user_id]
    );

    req.flash('success', 'Email berhasil diperbarui');
    res.redirect('/user/profile');
  } catch (error) {
    console.error('Update user email error:', error);
    req.flash('error', 'Terjadi kesalahan saat memperbarui email');
    res.redirect('/user/profile');
  }
});

// POST update user password
router.post('/profile/password', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const { current_password, new_password, confirm_password } = req.body;

    // Validasi password
    if (!current_password || !new_password || !confirm_password) {
      req.flash('error', 'Semua field password harus diisi');
      return res.redirect('/user/profile');
    }

    if (new_password !== confirm_password) {
      req.flash('error', 'Password baru tidak cocok dengan konfirmasi');
      return res.redirect('/user/profile');
    }

    // Cek password lama
    const [user] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [req.session.user_id]
    );

    const isMatch = await bcrypt.compare(current_password, user[0].password);
    if (!isMatch) {
      req.flash('error', 'Password saat ini tidak sesuai');
      return res.redirect('/user/profile');
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.session.user_id]
    );

    req.flash('success', 'Password berhasil diperbarui');
    res.redirect('/user/profile');
  } catch (error) {
    console.error('Update user password error:', error);
    req.flash('error', 'Terjadi kesalahan saat memperbarui password');
    res.redirect('/user/profile');
  }
});

module.exports = router;
// =====================
// Transactions report exports
// =====================
router.get('/transactions/report.xlsx', async (req, res) => {
  try {
    if (!req.session.user_id) return res.redirect('/auth/login');
    const userId = req.session.user_id;
    const { start_date, end_date, type = 'all' } = req.query;
    const { whereClause, params } = buildFilterConditions(start_date, end_date, null, null);

    let rows = [];
    if (type === 'income') {
      const [income] = await db.query(
        `SELECT 'Pemasukan' as jenis, i.entry_date as tanggal, i.description as deskripsi, CAST(i.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM income i LEFT JOIN accounts a ON i.account_id=a.id
         WHERE i.user_id = ? ${whereClause}
         ORDER BY i.entry_date DESC`,
        [userId, ...params]
      );
      rows = income;
    } else if (type === 'expense') {
      const [expense] = await db.query(
        `SELECT 'Pengeluaran' as jenis, e.entry_date as tanggal, e.description as deskripsi, CAST(e.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM expense e LEFT JOIN accounts a ON e.account_id=a.id
         WHERE e.user_id = ? ${whereClause}
         ORDER BY e.entry_date DESC`,
        [userId, ...params]
      );
      rows = expense;
    } else {
      const [income] = await db.query(
        `SELECT 'Pemasukan' as jenis, i.entry_date as tanggal, i.description as deskripsi, CAST(i.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM income i LEFT JOIN accounts a ON i.account_id=a.id
         WHERE i.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      const [expense] = await db.query(
        `SELECT 'Pengeluaran' as jenis, e.entry_date as tanggal, e.description as deskripsi, CAST(e.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM expense e LEFT JOIN accounts a ON e.account_id=a.id
         WHERE e.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      rows = [...income, ...expense].sort((a,b)=> new Date(b.tanggal) - new Date(a.tanggal));
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan');
    sheet.columns = [
      { header: 'Jenis', key: 'jenis', width: 15 },
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Deskripsi', key: 'deskripsi', width: 40 },
      { header: 'Jumlah', key: 'jumlah', width: 15 },
      { header: 'Akun', key: 'akun', width: 20 },
    ];
    rows.forEach(r => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-transaksi.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).send('Gagal membuat Excel');
  }
});

router.get('/transactions/report.pdf', async (req, res) => {
  try {
    if (!req.session.user_id) return res.redirect('/auth/login');
    const userId = req.session.user_id;
    const { start_date, end_date, type = 'all' } = req.query;
    const { whereClause, params } = buildFilterConditions(start_date, end_date, null, null);

    let rows = [];
    if (type === 'income') {
      const [income] = await db.query(
        `SELECT 'Pemasukan' as jenis, i.entry_date as tanggal, i.description as deskripsi, CAST(i.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM income i LEFT JOIN accounts a ON i.account_id=a.id
         WHERE i.user_id = ? ${whereClause}
         ORDER BY i.entry_date DESC`,
        [userId, ...params]
      );
      rows = income;
    } else if (type === 'expense') {
      const [expense] = await db.query(
        `SELECT 'Pengeluaran' as jenis, e.entry_date as tanggal, e.description as deskripsi, CAST(e.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM expense e LEFT JOIN accounts a ON e.account_id=a.id
         WHERE e.user_id = ? ${whereClause}
         ORDER BY e.entry_date DESC`,
        [userId, ...params]
      );
      rows = expense;
    } else {
      const [income] = await db.query(
        `SELECT 'Pemasukan' as jenis, i.entry_date as tanggal, i.description as deskripsi, CAST(i.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM income i LEFT JOIN accounts a ON i.account_id=a.id
         WHERE i.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      const [expense] = await db.query(
        `SELECT 'Pengeluaran' as jenis, e.entry_date as tanggal, e.description as deskripsi, CAST(e.amount AS DECIMAL(15,2)) as jumlah,
                a.name as akun
         FROM expense e LEFT JOIN accounts a ON e.account_id=a.id
         WHERE e.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      rows = [...income, ...expense].sort((a,b)=> new Date(b.tanggal) - new Date(a.tanggal));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-transaksi.pdf"');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(16).text('Laporan Transaksi', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    rows.forEach(r => {
      doc.text(`${r.jenis} | ${new Date(r.tanggal).toLocaleDateString('id-ID')} | ${r.deskripsi || '-'} | Rp ${formatCurrency(r.jumlah)} | ${r.akun || '-'}`);
    });
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).send('Gagal membuat PDF');
  }
});
