const express = require('express');
const router = express.Router();
const db = require('../config/db');
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

// GET halaman daftar transaksi dengan filter rentang waktu dan kategori
router.get('/', async (req, res) => {
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

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
    let totalCount = 0;

    if (type === 'income') {
      // Ambil hanya pemasukan dengan filter
      const { whereClause, params } = buildFilterConditions(startDate, endDate, categoryId, search);

      // Hitung total records
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM income i WHERE i.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      totalCount = countResult[0].total;

      const [incomeData] = await db.query(
        `SELECT
          i.id, i.user_id, i.category_id, i.account_id,
          CAST(i.amount AS DECIMAL(15,2)) as amount,
          i.description, i.entry_date, i.created_at,
          a.name as account_name,
          i.payment_method_id
         FROM income i
         LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.user_id = ? ${whereClause}
         ORDER BY i.entry_date DESC, i.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, ...params, limit, offset]
      );
      transactions = incomeData.map(t => ({...t, type: 'income'}));
    }
    else if (type === 'expense') {
      // Ambil hanya pengeluaran dengan filter
      const { whereClause, params } = buildFilterConditions(startDate, endDate, categoryId, search);

      // Hitung total records
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM expense e WHERE e.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      totalCount = countResult[0].total;

      const [expenseData] = await db.query(
        `SELECT
          e.id, e.user_id, e.category_id, e.account_id,
          CAST(e.amount AS DECIMAL(15,2)) as amount,
          e.description, e.entry_date, e.created_at,
          a.name as account_name,
          e.payment_method_id
         FROM expense e
         LEFT JOIN accounts a ON e.account_id = a.id
         WHERE e.user_id = ? ${whereClause}
         ORDER BY e.entry_date DESC, e.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, ...params, limit, offset]
      );
      transactions = expenseData.map(t => ({...t, type: 'expense'}));
    }
    else {
      // Ambil semua transaksi (pemasukan & pengeluaran) dengan filter
      const { whereClause, params } = buildFilterConditions(startDate, endDate, categoryId, search);

      // Hitung total records untuk income dan expense
      const [incomeCount] = await db.query(
        `SELECT COUNT(*) as total FROM income i WHERE i.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      const [expenseCount] = await db.query(
        `SELECT COUNT(*) as total FROM expense e WHERE e.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      totalCount = incomeCount[0].total + expenseCount[0].total;

      const [incomeData] = await db.query(
        `SELECT
          i.id, i.user_id, i.category_id, i.account_id,
          CAST(i.amount AS DECIMAL(15,2)) as amount,
          i.description, i.entry_date, i.created_at,
          a.name as account_name,
          i.payment_method_id,
          'income' as type
         FROM income i
         LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.user_id = ? ${whereClause}
         ORDER BY i.entry_date DESC, i.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, ...params, limit, offset]
      );

      const [expenseData] = await db.query(
        `SELECT
          e.id, e.user_id, e.category_id, e.account_id,
          CAST(e.amount AS DECIMAL(15,2)) as amount,
          e.description, e.entry_date, e.created_at,
          a.name as account_name,
          e.payment_method_id,
          'expense' as type
         FROM expense e
         LEFT JOIN accounts a ON e.account_id = a.id
         WHERE e.user_id = ? ${whereClause}
         ORDER BY e.entry_date DESC, e.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, ...params, limit, offset]
      );

      // Gabung dan urutkan berdasarkan tanggal
      transactions = [...incomeData, ...expenseData]
        .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
    }

    // Join dengan payment_methods untuk mendapatkan nama metode pembayaran
    const transactionsWithMethods = transactions.map(t => {
      // Convert string to number - be very explicit
      let amount = t.amount;
      
      // Try multiple conversion methods for safety
      if (typeof amount === 'string') {
        amount = Number(amount);
      }
      
      // If still not a valid number, try parseFloat
      if (isNaN(amount)) {
        amount = parseFloat(t.amount);
      }
      
      // Final fallback to 0
      if (isNaN(amount)) {
        amount = 0;
      }
      
      return {
        ...t,
        amount: amount,
        payment_method: paymentMethods.find(pm => pm.id === t.payment_method_id)?.method_name || '-'
      };
    });

    // Debug: log first few transactions
    if (transactionsWithMethods.length > 0) {
      console.log('\n=== Transaction Debug Info ===');
      transactionsWithMethods.slice(0, 3).forEach((t, idx) => {
        console.log(`Transaction ${idx + 1}:`, t.description, '- Amount:', t.amount, 'Type:', typeof t.amount);
      });
      console.log('===========================\n');
    }

    const totalPages = Math.ceil(totalCount / limit);

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
      search,
      page,
      limit,
      totalCount,
      totalPages,
      query: req.query,
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

const expenseCategories = [
  { id: 6, name: 'Makanan & Minuman' },
  { id: 7, name: 'Transportasi' },
  { id: 8, name: 'Belanja' },
  { id: 9, name: 'Tagihan' },
  { id: 10, name: 'Hiburan' },
  { id: 11, name: 'Kesehatan' },
  { id: 12, name: 'Pendidikan' }
];

module.exports = router;
// =====================
// Reports: list + exports
// =====================
router.get('/report', async (req, res) => {
  try {
    if (!req.session.user_id) return res.redirect('/auth/login');
    const userId = req.session.user_id;
    const username = req.session.username;
    const { start_date, end_date, type = 'all' } = req.query;

    const { whereClause, params } = buildFilterConditions(start_date, end_date, null, null);
    let rows = [];
    if (type === 'income') {
      const [income] = await db.query(
        `SELECT i.id, 'income' as type, i.entry_date, i.description, CAST(i.amount AS DECIMAL(15,2)) as amount,
                a.name as account_name
         FROM income i LEFT JOIN accounts a ON i.account_id=a.id
         WHERE i.user_id = ? ${whereClause}
         ORDER BY i.entry_date DESC`,
        [userId, ...params]
      );
      rows = income;
    } else if (type === 'expense') {
      const [expense] = await db.query(
        `SELECT e.id, 'expense' as type, e.entry_date, e.description, CAST(e.amount AS DECIMAL(15,2)) as amount,
                a.name as account_name
         FROM expense e LEFT JOIN accounts a ON e.account_id=a.id
         WHERE e.user_id = ? ${whereClause}
         ORDER BY e.entry_date DESC`,
        [userId, ...params]
      );
      rows = expense;
    } else {
      const [income] = await db.query(
        `SELECT i.id, 'income' as type, i.entry_date, i.description, CAST(i.amount AS DECIMAL(15,2)) as amount,
                a.name as account_name
         FROM income i LEFT JOIN accounts a ON i.account_id=a.id
         WHERE i.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      const [expense] = await db.query(
        `SELECT e.id, 'expense' as type, e.entry_date, e.description, CAST(e.amount AS DECIMAL(15,2)) as amount,
                a.name as account_name
         FROM expense e LEFT JOIN accounts a ON e.account_id=a.id
         WHERE e.user_id = ? ${whereClause}`,
        [userId, ...params]
      );
      rows = [...income, ...expense].sort((a,b)=> new Date(b.entry_date) - new Date(a.entry_date));
    }

    res.render('user/transactions/report', {
      username,
      rows,
      start_date,
      end_date,
      type,
      title: 'Laporan Transaksi'
    });
  } catch (error) {
    console.error('Report view error:', error);
    res.status(500).render('error', { message: 'Gagal memuat laporan', error });
  }
});

router.get('/report.xlsx', async (req, res) => {
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

router.get('/report.pdf', async (req, res) => {
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
