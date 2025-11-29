const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware untuk set main layout
router.use((req, res, next) => {
  res.locals.layout = 'layout/main';
  next();
});

// GET daftar kategori
router.get('/', async (req, res) => {
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
      active: 'categories',
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat daftar kategori',
      error
    });
  }
});

// POST tambah kategori baru
router.post('/', async (req, res) => {
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
        active: 'categories',
        error: 'Nama dan tipe kategori harus diisi',
        success: null
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
        active: 'categories',
        error: 'Kategori sudah ada',
        success: null
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
      active: 'categories',
      error: null,
      success: 'Kategori berhasil ditambahkan'
    });
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat menambah kategori',
      error
    });
  }
});

// DELETE hapus kategori
router.delete('/:id', async (req, res) => {
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
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus kategori'
    });
  }
});

module.exports = router;
