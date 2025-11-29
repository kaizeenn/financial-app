const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET payment methods list
router.get('/', async (req, res) => {
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
      success: null
    });
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat metode pembayaran',
      error
    });
  }
});

// POST add new payment method
router.post('/', async (req, res) => {
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
      success: 'Metode pembayaran berhasil ditambahkan'
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    
    const [methods] = await db.query(
      'SELECT * FROM payment_methods ORDER BY method_name'
    );

    res.status(400).render('user/payment-methods/index', {
      methods,
      error: error.message || 'Terjadi kesalahan saat menambah metode pembayaran',
      success: null
    });
  }
});

// DELETE payment method
router.delete('/:id', async (req, res) => {
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
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus metode pembayaran'
    });
  }
});

module.exports = router;
