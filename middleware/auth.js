function isAuthenticated(req, res, next) {
  // Cek apakah user sudah login
  if (req.session && req.session.user_id) {
    return next();
  }
  // Jika belum login, arahkan ke halaman login yang benar
  res.redirect('/auth/login');
}

module.exports = isAuthenticated;
