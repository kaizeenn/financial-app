const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// GET dashboard
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;

    // Get total balance from accounts
    const [accounts] = await db.query(
      'SELECT SUM(balance) as totalBalance FROM accounts WHERE user_id = ?',
      [userId]
    );

    // Get total income and expense for current month
    const [totals] = await db.query(
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

    // Get monthly data for chart (last 6 months)
    const [monthlyData] = await db.query(
      `SELECT 
        DATE_FORMAT(m.month_date, '%b %Y') as month,
        COALESCE(i.income_total, 0) as income,
        COALESCE(e.expense_total, 0) as expense
       FROM (
         SELECT LAST_DAY(CURRENT_DATE - INTERVAL n MONTH) as month_date
         FROM (
           SELECT 0 as n UNION SELECT 1 UNION SELECT 2 
           UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
         ) months
       ) m
       LEFT JOIN (
         SELECT 
           DATE_FORMAT(entry_date, '%b %Y') as month,
           SUM(amount) as income_total
         FROM income
         WHERE user_id = ?
         AND entry_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(entry_date, '%b %Y')
       ) i ON DATE_FORMAT(m.month_date, '%b %Y') = i.month
       LEFT JOIN (
         SELECT 
           DATE_FORMAT(entry_date, '%b %Y') as month,
           SUM(amount) as expense_total
         FROM expense
         WHERE user_id = ?
         AND entry_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(entry_date, '%b %Y')
       ) e ON DATE_FORMAT(m.month_date, '%b %Y') = e.month
       ORDER BY m.month_date`,
      [userId, userId]
    );

    // Ambil semua kategori pengeluaran dari database
    const [expenseCategories] = await db.query(
      "SELECT id, name FROM categories WHERE type = 'expense' ORDER BY name"
    );

    const [categoryTotals] = await db.query(
      `SELECT 
        category_id,
        SUM(amount) as total
       FROM expense 
       WHERE user_id = ?
         AND MONTH(entry_date) = MONTH(CURRENT_DATE())
         AND YEAR(entry_date) = YEAR(CURRENT_DATE())
       GROUP BY category_id`,
      [userId]
    );

    // Map totals to category names dari database
    const categoryData = expenseCategories.map(cat => {
      const total = categoryTotals.find(t => t.category_id === cat.id);
      return {
        name: cat.name,
        total: total ? parseFloat(total.total) : 0
      };
    }).filter(cat => cat.total > 0);

    // Format data for charts
    const monthlyDataReversed = [...monthlyData].reverse();
    const chartData = {
      labels: monthlyDataReversed.map(d => d.month),
      incomeData: monthlyDataReversed.map(d => parseInt(d.income)),
      expenseData: monthlyDataReversed.map(d => parseInt(d.expense)),
      categoryLabels: categoryData.map(c => c.name),
      categoryData: categoryData.map(c => c.total)
    };

    console.log('Dashboard categoryLabels:', JSON.stringify(chartData.categoryLabels));
    console.log('Dashboard categoryData:', JSON.stringify(chartData.categoryData));

    res.render('dashboard/index', {
      title: 'Dashboard',
      username,
      totalBalance: accounts[0]?.totalBalance || 0,
      totalIncome: totals[0]?.totalIncome || 0,
      totalExpense: totals[0]?.totalExpense || 0,
      chartLabels: JSON.stringify(chartData.labels),
      incomeData: JSON.stringify(chartData.incomeData),
      expenseData: JSON.stringify(chartData.expenseData),
      categoryLabels: JSON.stringify(chartData.categoryLabels),
      categoryData: JSON.stringify(chartData.categoryData)
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      message: 'Terjadi kesalahan saat memuat dashboard',
      error
    });
  }
});

// POST add transaction
router.post('/add-transaction', async (req, res) => {
  try {
    const { type, category, amount, date, note } = req.body;
    const userId = req.session.user_id;

    // Validasi input
    if (!type || !category || !amount || !date) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    // Format jumlah
    if (isNaN(amount)) {
      throw new Error('Format jumlah tidak valid');
    }

    // Insert transaksi sesuai jenisnya
    if (type === 'income') {
      await db.query(
        `INSERT INTO income (user_id, category_id, amount, entry_date, note) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, category, amount, date, note]
      );
    } else if (type === 'expense') {
      await db.query(
        `INSERT INTO expense (user_id, category_id, amount, entry_date, note) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, category, amount, date, note]
      );
    } else {
      return res.status(400).json({ error: 'Jenis transaksi tidak valid' });
    }

    res.status(201).json({ message: 'Transaksi berhasil ditambahkan' });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan transaksi' });
  }
});

module.exports = router;
