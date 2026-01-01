const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { auth } = require('../middleware/auth.middleware')

router.use(auth)

router.post('/', bookingController.createBooking);
router.get('/my-bookings', bookingController.getUserBookings);
router.get('/:id', bookingController.getBooking);
router.put('/:id/cancel', bookingController.cancelBooking);
router.get('/event/:eventId/availability', bookingController.getEventAvailability);

module.exports = router;