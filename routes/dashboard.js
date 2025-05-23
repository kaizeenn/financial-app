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
        GROUP BY DATE_FORMAT(entry_date, '%b %Y')
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
        GROUP BY DATE_FORMAT(entry_date, '%d %b')
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

    res.render('dashboard/index', {
      title: 'Dashboard',
      username,
      period,  // pass period to view for dropdown selection
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
