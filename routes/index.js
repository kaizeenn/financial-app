var express = require('express');
var router = express.Router();

/* GET home page - redirect to login if not authenticated, dashboard if authenticated */
router.get('/', function(req, res, next) {
  if (!req.session.user_id) {
    res.redirect('/auth/login');
  } else {
    res.redirect('/dashboard');
  }
});

module.exports = router;
