var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var flash = require('express-flash');
var expressLayouts = require('express-ejs-layouts');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var investmentRouter = require('./routes/investmentRoutes');
var adminRouter = require('./routes/admin');
var userRouter = require('./routes/user');
var debtsRouter = require('./routes/debts');
var recurringRouter = require('./routes/recurring');
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
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes (accessible without authentication)
app.use('/auth', authRouter);

// Root route handler
app.use('/', indexRouter);

// Admin routes
app.use('/admin', adminRouter);

// User routes
app.use('/user', userRouter);

// Mount other user-related routes
app.use('/user/debts', debtsRouter);
app.use('/user/recurring', recurringRouter);

// Investasi route
app.use('/invest', isAuthenticated, investmentRouter);

// Rute ini mungkin masih diperlukan jika ada link lama, tapi idealnya semua link di view mengarah ke /user/...
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
