// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database.config');

// ✅ FIXED - Remove .default
const apiRoutes = require('./routes/index.route');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use('/api', apiRoutes);

// Hardcoded user credentials
const users = [
  { id: 1, username: 'admin', password: 'password123', email: 'admin@example.com' },
  { id: 2, username: 'user1', password: '123456', email: 'user1@example.com' }
];

// Frontend Routes

// Serve login page as homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } else {
    res.redirect('/');
  }
});

// API Authentication Routes

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    req.session.user = user;
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
    res.status(401).json({
      success: false,
      message: 'Invalid credentials!'
    });
  }
});

// Signup endpoint
app.post('/signup', (req, res) => {
  const { username, password, email } = req.body;
  
  const existingUser = users.find(u => u.username === username || u.email === email);
  
  if (existingUser) {
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
    res.json({
      success: true,
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        email: req.session.user.email
      }
    });
  } else {
    res.status(401).json({ 
      success: false,
      error: 'Not authenticated' 
    });
  }
});

// Logout endpoint
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// // ✅ FIXED - Handle unhandled routes for API
// app.use(/\/api\/*/, (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'API route not found'
//   });
// });

// // ✅ FIXED - Handle unhandled routes for frontend
// app.use('*', (req, res) => {
//   res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
// });

app.use(/.*/, (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({
      success: false,
      message: 'API route not found'
    });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Victoria Hall Booking System running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on http://localhost:${PORT}`);
});