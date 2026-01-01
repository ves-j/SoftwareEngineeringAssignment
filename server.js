const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database.config');

const logger = require('./config/logger.config')
const requestLogger = require('./middleware/logger.middleware')

const apiRoutes = require('./routes/index.route');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(requestLogger)

app.use('/api', apiRoutes);

// Hardcoded user credentials
// const users = [
//   { id: 1, username: 'admin', password: 'password123', email: 'admin@example.com' },
//   { id: 2, username: 'user1', password: '123456', email: 'user1@example.com' }
// ];

// Frontend Routes

// Serve login page as homepage
app.get('/', (req, res) => {
  logger.info('Serving login page');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
  logger.info('Serving signup page');
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));

  // if (req.session.user) {
  //   logger.info(`Serving dashboard for user: ${req.session.user.username}`);
  //   res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  // } else {
  //   logger.warn('Unauthorized access attempt to dashboard');
  //   res.redirect('/');
  // }
});

// API Authentication Routes

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  logger.info(`Login attempt for username: ${username}`);
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    req.session.user = user;
    logger.info(`Successful login for user: ${username}`);
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } else {
    logger.warn(`Failed login attempt for username: ${username}`);
    res.status(401).json({
      success: false,
      message: 'Invalid credentials!'
    });
  }
});

// Signup endpoint
app.post('/signup', (req, res) => {
  const { username, password, email } = req.body;

  logger.info(`Signup attempt for username: ${username}, email: ${email}`);
  
  const existingUser = users.find(u => u.username === username || u.email === email);
  
  if (existingUser) {
    logger.warn(`User already exists: ${username} or ${email}`);
    res.status(409).json({
      success: false,
      message: 'User already exists!'
    });
  } else {
    const newUser = {
      id: users.length + 1,
      username,
      password,
      email
    };
    users.push(newUser);
    
    req.session.user = newUser;
    logger.info(`New user created: ${username} with ID: ${newUser.id}`);
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  }
});

// Get user data
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    logger.debug(`User data requested for: ${req.session.user.username}`);
    res.json({
      success: true,
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        email: req.session.user.email
      }
    });
  } else {
    logger.warn('Unauthorized attempt to access user data');
    res.status(401).json({ 
      success: false,
      error: 'Not authenticated' 
    });
  }
});

// Logout endpoint
app.get('/logout', (req, res) => {
  if (req.session.user) {
    logger.info(`User logged out: ${req.session.user.username}`);
  }
  req.session.destroy();
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});


// app.use('/api/*', (req, res) => {
//   logger.warn(`API route not found: ${req.originalUrl}`)
//   res.status(404).json({
//     success: false,
//     message: 'API route not found'
//   });
// });

// app.use((req, res) => {
//   logger.warn(`Route not found: ${req.originalUrl}`);
//   res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
// });


// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


app.listen(PORT, () => {
  console.log(`Victoria Hall Booking System running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on http://localhost:${PORT}`);
});