const express = require('express');
const router = express.Router();
const db = require('../config/db');
const isAuthenticated = require('../middleware/auth');

// Helper function to update debt status
async function updateDebtStatus(debtId) {
  try {
    // Get total paid amount
    const [paymentResult] = await db.query(
      'SELECT SUM(amount) as total_paid FROM debt_payments WHERE debt_id = ?',
      [debtId]
    );

    const totalPaid = paymentResult[0].total_paid || 0;

    // Get debt details
    const [debtResult] = await db.query(
      'SELECT amount, due_date, last_payment_date FROM debts WHERE id = ?',
      [debtId]
    );

    if (debtResult.length === 0) return;

    const debt = debtResult[0];
    const remainingAmount = debt.amount - totalPaid;
    let status = 'pending';

    if (remainingAmount <= 0) {
      status = 'paid';
    } else if (remainingAmount < debt.amount) {
      status = 'partial';
    }

    // Check for overdue
    if (debt.due_date && remainingAmount > 0) {
      const today = new Date();
      const dueDate = new Date(debt.due_date);
      if (today > dueDate) {
        status = 'overdue';
      }
    }

    // Update debt
    await db.query(
      'UPDATE debts SET paid_amount = ?, status = ?, last_payment_date = ? WHERE id = ?',
      [totalPaid, status, debt.last_payment_date, debtId]
    );
  } catch (error) {
    console.error('Error updating debt status:', error);
  }
}

// Middleware untuk set main layout
router.use((req, res, next) => {
  res.locals.layout = 'layout/main';
  next();
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const { type = 'all', status = 'all' } = req.query;
    const username = req.session.username;

    // Build query for debts
    let debtsQuery = 'SELECT * FROM debts WHERE user_id = ?';
    const queryParams = [user_id];

    if (type !== 'all') {
      debtsQuery += ' AND type = ?';
      queryParams.push(type);
    }
    if (status !== 'all') {
      debtsQuery += ' AND status = ?';
      queryParams.push(status);
    }
    debtsQuery += ' ORDER BY due_date DESC';

    // Fetch data
    const [debts] = await db.query(debtsQuery, queryParams);
    const [accounts] = await db.query('SELECT * FROM accounts WHERE user_id = ?', [user_id]);

    // Calculate summary
    const [summaryResult] = await db.query(
      `SELECT
        SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) as total_debt,
        SUM(CASE WHEN type = 'debt' THEN paid_amount ELSE 0 END) as total_paid_debt,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credit,
        SUM(CASE WHEN type = 'credit' THEN paid_amount ELSE 0 END) as total_paid_credit
      FROM debts WHERE user_id = ?`,
      [user_id]
    );

    const summary = {
      total_debt: summaryResult[0].total_debt || 0,
      total_paid_debt: summaryResult[0].total_paid_debt || 0,
      total_remaining_debt: (summaryResult[0].total_debt || 0) - (summaryResult[0].total_paid_debt || 0),
      total_credit: summaryResult[0].total_credit || 0,
      total_paid_credit: summaryResult[0].total_paid_credit || 0,
      total_remaining_credit: (summaryResult[0].total_credit || 0) - (summaryResult[0].total_paid_credit || 0),
    };

    res.render('user/debts/index', {
      title: 'Utang Piutang',
      username,
      active: 'debts',
      debts,
      accounts,
      summary,
      type,
      status,
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  } catch (error) {
    console.error('Debts page error:', error);
    res.status(500).send('Server Error');
  }
});

// Get categories for debt/credit type
router.get('/categories', isAuthenticated, async (req, res) => {
  try {
    const { type } = req.query;
    const tableName = type === 'debt' ? 'debt_categories' : 'credit_categories';
    const [categories] = await db.query(`SELECT * FROM ${tableName}`);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Add new debt/credit
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { type, category, creditor_debtor_name, amount, due_date, description } = req.body;
    const user_id = req.session.user_id;
    const cleanAmount = amount.replace(/[^\d]/g, '');

    const categoryField = type === 'debt' ? 'debt_category_id' : 'credit_category_id';

    await db.query(
      `INSERT INTO debts (user_id, type, creditor_debtor_name, amount, due_date, description, status, ${categoryField}) VALUES (?, ?, ?, ?, ?, ?, "pending", ?)`,
      [user_id, type, creditor_debtor_name, cleanAmount, due_date || null, description, category]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding debt:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan data.' });
  }
});

// Add payment
router.post('/payments', isAuthenticated, async (req, res) => {
  try {
    const { debt_id, amount, payment_date, account_id } = req.body;
    const user_id = req.session.user_id;
    const cleanAmount = amount.replace(/[^\d]/g, '');

    // Verify debt belongs to user
    const [debtCheck] = await db.query('SELECT id FROM debts WHERE id = ? AND user_id = ?', [debt_id, user_id]);
    if (debtCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    // Insert payment
    await db.query(
      'INSERT INTO debt_payments (debt_id, amount, payment_date, account_id) VALUES (?, ?, ?, ?)',
      [debt_id, cleanAmount, payment_date, account_id || null]
    );

    // Update debt status
    await updateDebtStatus(debt_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan pembayaran.' });
  }
});

// Get payment history for a debt
router.get('/:debtId/payments', isAuthenticated, async (req, res) => {
  try {
    const { debtId } = req.params;
    const user_id = req.session.user_id;

    // Verify debt belongs to user
    const [debtCheck] = await db.query('SELECT id FROM debts WHERE id = ? AND user_id = ?', [debtId, user_id]);
    if (debtCheck.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const [payments] = await db.query(
      `SELECT dp.*, a.name as account_name
       FROM debt_payments dp
       LEFT JOIN accounts a ON dp.account_id = a.id
       WHERE dp.debt_id = ?
       ORDER BY dp.payment_date DESC`,
      [debtId]
    );

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get debt/credit detail
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.session.user_id;

    // Get debt details with category and account info
    const [debtResult] = await db.query(
      `SELECT d.*,
              dc.name as debt_category_name,
              cc.name as credit_category_name,
              a.name as account_name
       FROM debts d
       LEFT JOIN debt_categories dc ON d.debt_category_id = dc.id
       LEFT JOIN credit_categories cc ON d.credit_category_id = cc.id
       LEFT JOIN accounts a ON d.account_id = a.id
       WHERE d.id = ? AND d.user_id = ?`,
      [id, user_id]
    );

    if (debtResult.length === 0) {
      return res.status(404).send('Debt not found');
    }

    const debt = debtResult[0];

    // Get payment history
    const [payments] = await db.query(
      `SELECT dp.*, a.name as account_name
       FROM debt_payments dp
       LEFT JOIN accounts a ON dp.account_id = a.id
       WHERE dp.debt_id = ?
       ORDER BY dp.payment_date DESC`,
      [id]
    );

    res.render('user/debts/detail', {
      title: 'Detail Utang/Piutang',
      username: req.session.username,
      active: 'debts',
      debt,
      payments,
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  } catch (error) {
    console.error('Error fetching debt detail:', error);
    res.status(500).send('Server Error');
  }
});

// Update debt/credit
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, creditor_debtor_name, amount, due_date, description } = req.body;
    const user_id = req.session.user_id;
    const cleanAmount = amount.replace(/[^\d]/g, '');

    // Verify debt belongs to user
    const [debtCheck] = await db.query('SELECT id FROM debts WHERE id = ? AND user_id = ?', [id, user_id]);
    if (debtCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const categoryField = type === 'debt' ? 'debt_category_id' : 'credit_category_id';

    await db.query(
      `UPDATE debts SET
        type = ?, creditor_debtor_name = ?, amount = ?, due_date = ?, description = ?, ${categoryField} = ?
       WHERE id = ? AND user_id = ?`,
      [type, creditor_debtor_name, cleanAmount, due_date || null, description, category, id, user_id]
    );

    // Recalculate status after amount change
    await updateDebtStatus(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate data.' });
  }
});

// Delete debt/credit
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.session.user_id;

    // Verify debt belongs to user
    const [debtCheck] = await db.query('SELECT id FROM debts WHERE id = ? AND user_id = ?', [id, user_id]);
    if (debtCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    // Delete payment history first
    await db.query('DELETE FROM debt_payments WHERE debt_id = ?', [id]);

    // Delete debt
    await db.query('DELETE FROM debts WHERE id = ? AND user_id = ?', [id, user_id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus data.' });
  }
});

// Get dashboard summary for debts
router.get('/dashboard/summary', isAuthenticated, async (req, res) => {
  try {
    const user_id = req.session.user_id;

    const [summaryResult] = await db.query(
      `SELECT
        SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) as total_debt,
        SUM(CASE WHEN type = 'debt' THEN paid_amount ELSE 0 END) as total_paid_debt,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credit,
        SUM(CASE WHEN type = 'credit' THEN paid_amount ELSE 0 END) as total_paid_credit,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as total_overdue
      FROM debts WHERE user_id = ?`,
      [user_id]
    );

    // Get upcoming due dates (next 7 days)
    const [upcomingDebts] = await db.query(
      `SELECT id, creditor_debtor_name, amount, paid_amount, due_date, type
       FROM debts
       WHERE user_id = ? AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       AND status != 'paid'
       ORDER BY due_date ASC
       LIMIT 5`,
      [user_id]
    );

    const summary = {
      total_debt: summaryResult[0].total_debt || 0,
      total_paid_debt: summaryResult[0].total_paid_debt || 0,
      total_remaining_debt: (summaryResult[0].total_debt || 0) - (summaryResult[0].total_paid_debt || 0),
      total_credit: summaryResult[0].total_credit || 0,
      total_paid_credit: summaryResult[0].total_paid_credit || 0,
      total_remaining_credit: (summaryResult[0].total_credit || 0) - (summaryResult[0].total_paid_credit || 0),
      total_overdue: summaryResult[0].total_overdue || 0,
      upcoming_debts: upcomingDebts
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Periodic task to check and update overdue debts
router.post('/check-overdue', isAuthenticated, async (req, res) => {
  try {
    const user_id = req.session.user_id;

    // Update overdue debts
    await db.query(
      `UPDATE debts
       SET status = 'overdue'
       WHERE user_id = ?
       AND due_date < CURDATE()
       AND remaining_amount > 0
       AND status != 'paid'`,
      [user_id]
    );

    res.json({ success: true, message: 'Overdue check completed' });
  } catch (error) {
    console.error('Error checking overdue debts:', error);
    res.status(500).json({ success: false, message: 'Failed to check overdue debts' });
  }
});

module.exports = router;
