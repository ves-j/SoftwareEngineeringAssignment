// controllers/booking.controller.js
const bookingService = require('../services/booking.service');
const Event = require('../models/event.model');

async function createBooking(req, res) {
  try {
    const { eventId, seatIds, customer, concessions } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if booking is allowed (loyalty member early access)
    const isLoyaltyMember = req.user?.isLoyaltyMember || false;
    const oneWeekBeforeRelease = new Date(event.releaseDate);
    oneWeekBeforeRelease.setDate(oneWeekBeforeRelease.getDate() - 7);
    
    if (new Date() < oneWeekBeforeRelease && !isLoyaltyMember) {
      return res.status(403).json({
        success: false,
        message: 'Booking not yet available. Loyalty members can book 1 week early.'
      });
    }
    
    const bookingData = {
      eventId,
      seatIds,
      customer,
      concessions,
      isLoyaltyMember,
      event
    };
    
    const booking = await bookingService.createBooking(bookingData);
    
    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function getBooking(req, res) {
  try {
    const booking = await bookingService.getBookingByReference(req.params.reference);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
}

async function cancelBooking(req, res) {
  try {
    const booking = await bookingService.cancelBooking(req.params.reference);
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  createBooking,
  getBooking,
  cancelBooking
};