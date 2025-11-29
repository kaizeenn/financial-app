function roleMiddleware(requiredLevel) {
  return (req, res, next) => {
    // Cek apakah user sudah login
    if (!req.session || !req.session.user_id) {
      return res.redirect('/auth/login');
    }

    // Cek level user
    if (req.session.level !== requiredLevel) {
      return res.status(403).render('error', {
        message: 'Akses ditolak',
        error: { status: 403 }
      });
    }

    next();
  };
}

module.exports = roleMiddleware;
