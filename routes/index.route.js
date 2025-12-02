const express = require('express');
const router = express.Router();

const bookingRoutes = require('./booking.route');
const eventRoutes = require('./event.route');
const seatRoutes = require('./seat.route');
const authRoutes = require('./auth.routes')

router.use('/auth', authRoutes)
router.use('/events', eventRoutes);
router.use('/seats', seatRoutes);

router.use('/bookings', bookingRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Victoria Hall Booking API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;