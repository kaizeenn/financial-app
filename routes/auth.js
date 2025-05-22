const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Middleware to set auth layout for all auth routes
router.use((req, res, next) => {
  res.locals.layout = 'layout/auth';
  next();
});

// GET register
router.get('/register', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session && req.session.user_id) {
    return res.redirect('/dashboard');
  }
  res.render('auth/register', { error: null });
});

// POST register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirm_password } = req.body;

    // Validate password match
    if (password !== confirm_password) {
      return res.render('auth/register', { error: "Kata sandi tidak cocok." });
    }

    // Check if username already exists
    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?", 
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.render('auth/register', { 
        error: "Username atau email sudah digunakan." 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await db.query(
      "INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())",
      [username, email, hashedPassword]
    );

    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', { 
      error: "Terjadi kesalahan saat mendaftar." 
    });
  }
});

// GET login
router.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session && req.session.user_id) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: null });
});

// POST login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Cek username/email
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?", 
      [username, username]
    );
    if(rows.length === 0) {
      return res.render('auth/login', { error: "User tidak ditemukan." });
    }
    const user = rows[0];
    // Cek password
    const match = await bcrypt.compare(password, user.password);
    if(!match) {
      return res.render('auth/login', { error: "Password salah." });
    }
    // Simpan user di session
    req.session.user_id = user.id;
    req.session.username = user.username;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: "Terjadi kesalahan saat login." });
  }
});

// GET logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;
