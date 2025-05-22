const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET profile page
router.get('/', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const [user] = await db.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [req.session.user_id]
    );

    res.render('profile/index', {
      title: 'Profil Pengguna',
      layout: 'layout/main',
      username: req.session.username,
      user: user[0],
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan saat memuat profil',
      error
    });
  }
});

// POST update email
router.post('/email', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const { email } = req.body;

    // Validasi email
    if (!email || !email.includes('@')) {
      req.flash('error', 'Email tidak valid');
      return res.redirect('/profile');
    }

    // Cek apakah email sudah digunakan
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.session.user_id]
    );

    if (existing.length > 0) {
      req.flash('error', 'Email sudah digunakan');
      return res.redirect('/profile');
    }

    // Update email
    await db.query(
      'UPDATE users SET email = ? WHERE id = ?',
      [email, req.session.user_id]
    );

    req.flash('success', 'Email berhasil diperbarui');
    res.redirect('/profile');
  } catch (error) {
    console.error('Update email error:', error);
    req.flash('error', 'Terjadi kesalahan saat memperbarui email');
    res.redirect('/profile');
  }
});

// POST update password
router.post('/password', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/auth/login');
    }

    const { current_password, new_password, confirm_password } = req.body;

    // Validasi password
    if (!current_password || !new_password || !confirm_password) {
      req.flash('error', 'Semua field password harus diisi');
      return res.redirect('/profile');
    }

    if (new_password !== confirm_password) {
      req.flash('error', 'Password baru tidak cocok dengan konfirmasi');
      return res.redirect('/profile');
    }

    if (new_password.length < 6) {
      req.flash('error', 'Password baru minimal 6 karakter');
      return res.redirect('/profile');
    }

    // Cek password lama
    const [user] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [req.session.user_id]
    );

    const isMatch = await bcrypt.compare(current_password, user[0].password);
    if (!isMatch) {
      req.flash('error', 'Password saat ini tidak sesuai');
      return res.redirect('/profile');
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.session.user_id]
    );

    req.flash('success', 'Password berhasil diperbarui');
    res.redirect('/profile');
  } catch (error) {
    console.error('Update password error:', error);
    req.flash('error', 'Terjadi kesalahan saat memperbarui password');
    res.redirect('/profile');
  }
});

module.exports = router;
