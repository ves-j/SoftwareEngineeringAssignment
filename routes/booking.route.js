// routes/booking.route.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const auth = require('../middleware/auth.middleware');

router.post('/', auth, bookingController.createBooking);
router.get('/:reference', bookingController.getBooking);
router.put('/:reference/cancel', bookingController.cancelBooking);

module.exports = router;