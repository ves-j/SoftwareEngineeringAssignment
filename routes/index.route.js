// routes/index.route.js
const express = require('express');
const router = express.Router();

const bookingRoutes = require('./booking.route');
const eventRoutes = require('./event.route');
const seatRoutes = require('./seat.route');

router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/seats', seatRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Victoria Hall Booking API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;