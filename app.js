var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var expressLayouts = require('express-ejs-layouts');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var dashboardRouter = require('./routes/dashboard');
var transactionsRouter = require('./routes/transactions');
var accountsRouter = require('./routes/accounts');
var categoriesRouter = require('./routes/categories');
var isAuthenticated = require('./middleware/auth');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout/main');

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if using HTTPS
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes (accessible without authentication)
app.use('/auth', authRouter);

// Root route handler
app.use('/', indexRouter);

// Protected routes
app.use('/dashboard', isAuthenticated, dashboardRouter);
app.use('/transactions', isAuthenticated, transactionsRouter);
app.use('/accounts', isAuthenticated, accountsRouter);
app.use('/categories', isAuthenticated, categoriesRouter);
app.use('/users', isAuthenticated, usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
