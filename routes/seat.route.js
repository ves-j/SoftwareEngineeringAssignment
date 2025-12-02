const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seat.controller');

router.get('/available', seatController.getAvailableSeats);
router.get('/initialize', seatController.initializeTheater);
router.get('/pricing/:eventId/:seatId', seatController.getSeatPricing);

module.exports = router;

// {{base_url}}/seats/pricing/:eventId/:seatId