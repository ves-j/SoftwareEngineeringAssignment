const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database.config');

const logger = require('./config/logger.config');
const requestLogger = require('./middleware/logger.middleware');

const apiRoutes = require('./routes/index.route');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Track DB status so we can respond cleanly instead of crashing
let dbReady = false;


app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret', // avoids crash if missing
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(requestLogger);

// Frontend routes
app.get('/', (req, res) => {
  logger.info('Serving login page');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  logger.info('Serving signup page');
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    dbReady,
    mongooseState: require('mongoose').connection.readyState
  });
});

// If DB is down, return 503 for API instead of crashing / 500
app.use('/api', (req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({
      success: false,
      message: 'Database unavailable. Please try again in a moment.'
    });
  }
  next();
});

app.use('/api', apiRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

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


(async () => {
  try {
    await connectDB(5);
    dbReady = true;
  } catch (err) {
    dbReady = false;
    console.error('⚠️ MongoDB is not reachable at startup. Server will still run, but /api will return 503 until DB connects.');
    console.error('Root cause is usually Atlas IP allowlist or a paused cluster:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Victoria Hall Booking System running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();
