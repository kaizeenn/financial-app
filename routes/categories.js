const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET daftar kategori
router.get('/', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    // Ambil semua kategori aktif
    const [categories] = await db.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY type, name'
    );

    res.render('categories/index', {
      categories,
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
      return res.render('categories/index', {
        categories,
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
      return res.render('categories/index', {
        categories,
        error: 'Kategori sudah ada',
        success: null
      });
    }

    // Tambah kategori baru dengan is_active default TRUE
    await db.query(
      'INSERT INTO categories (name, type, is_active) VALUES (?, ?, TRUE)',
      [name, type]
    );

    const [categories] = await db.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY type, name'
    );
    res.render('categories/index', {
      categories,
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

router.post('/:id/toggle-active', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const categoryId = req.params.id;
    const { isActive } = req.body;

    await db.query(
      'UPDATE categories SET is_active = ? WHERE id = ?',
      [isActive, categoryId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle category active error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengubah status kategori'
    });
  }
});

module.exports = router;
