function isAuthenticated(req, res, next) {
  // Check if user is authenticated
  if (req.session && req.session.user_id) {
    return next();
  }
  // If not authenticated, redirect to login
  res.redirect('/login');
}

module.exports = isAuthenticated;
