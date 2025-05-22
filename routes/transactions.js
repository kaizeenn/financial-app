const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper function untuk format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// GET halaman daftar transaksi
router.get('/', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user_id;
    const username = req.session.username;
    const type = req.query.type || 'all'; // Filter: all, income, expense
    
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
      // Ambil hanya pemasukan
      const [incomeData] = await db.query(
        `SELECT 
          i.*, 
          a.name as account_name,
          i.payment_method_id
         FROM income i 
         LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.user_id = ?
         ORDER BY i.entry_date DESC, i.created_at DESC`,
        [userId]
      );
      transactions = incomeData.map(t => ({...t, type: 'income'}));
    } 
    else if (type === 'expense') {
      // Ambil hanya pengeluaran
      const [expenseData] = await db.query(
        `SELECT 
          e.*, 
          a.name as account_name,
          e.payment_method_id
         FROM expense e
         LEFT JOIN accounts a ON e.account_id = a.id
         WHERE e.user_id = ?
         ORDER BY e.entry_date DESC, e.created_at DESC`,
        [userId]
      );
      transactions = expenseData.map(t => ({...t, type: 'expense'}));
    }
    else {
      // Ambil semua transaksi (pemasukan & pengeluaran)
      const [incomeData] = await db.query(
        `SELECT 
          i.*, 
          a.name as account_name,
          i.payment_method_id,
          'income' as type
         FROM income i 
         LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.user_id = ?`,
        [userId]
      );
      
      const [expenseData] = await db.query(
        `SELECT 
          e.*, 
          a.name as account_name,
          e.payment_method_id,
          'expense' as type
         FROM expense e
         LEFT JOIN accounts a ON e.account_id = a.id
         WHERE e.user_id = ?`,
        [userId]
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

    res.render('transactions/index', {
      username,
      transactions: transactionsWithMethods,
      accounts,
      categories,
      paymentMethods,
      type,
      error: null
    });
  } catch (error) {
    console.error('Transaction list error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat daftar transaksi',
      error
    });
  }
});

// POST tambah transaksi baru
router.post('/', async (req, res) => {
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
    const amount = parseInt(rawAmount.replace(/\./g, ''));
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
    console.error('Add transaction error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat menambah transaksi'
    });
  } finally {
    connection.release();
  }
});

// DELETE hapus transaksi
router.delete('/:type/:id', async (req, res) => {
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
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus transaksi'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
