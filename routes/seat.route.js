const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seat.controller');

router.get('/available', seatController.getAvailableSeats);
router.get('/pricing/:eventId/:seatId', seatController.getSeatPricing);


// Vesal, I've initialised the seats, so don't run this endpoint
// router.get('/initialize', seatController.initializeTheater);

module.exports = router;

// {{base_url}}/seats/pricing/:eventId/:seatId