var express = require('express');
var router = express.Router();

/* GET home page - redirect to login if not authenticated, dashboard if authenticated */
router.get('/', function(req, res, next) {
  if (!req.session.user_id) {
    res.redirect('/auth/login');
  } else if (req.session.level === 1) {
    // Redirect admin to admin dashboard
    res.redirect('/admin/dashboard');
  } else {
    // Redirect regular user to user dashboard
    res.redirect('/user/dashboard');
  }
});

module.exports = router;
