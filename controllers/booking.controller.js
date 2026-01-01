const bookingService = require('../services/booking.service');
const Event = require('../models/event.model');

async function createBooking(req, res) {
  try {
    const { eventId, seatIds, concessions } = req.body;
    const userId = req.user._id;
    
    const customer = {
      name: req.user.name,
      email: req.user.email,
      phone: req.body.phone || '' 
    };
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('A')
    
    const availability = await bookingService.getEventAvailability(eventId);
    if (availability.isSoldOut) {
      return res.status(400).json({
        success: false,
        message: 'This event is completely sold out'
      });
    }
    
    console.log('B')
    // Check if booking is allowed (loyalty member early access)
    const isLoyaltyMember = req.user.isLoyaltyMember || false;
    const oneWeekBeforeRelease = new Date(event.releaseDate);
    oneWeekBeforeRelease.setDate(oneWeekBeforeRelease.getDate() - 7);
    
    console.log('C')
    if (new Date() < oneWeekBeforeRelease && !isLoyaltyMember) {
      return res.status(403).json({
        success: false,
        message: 'Booking not yet available. Loyalty members can book 1 week early.'
      });
    }
    
    console.log('d')
    const bookingData = {
      eventId,
      seatIds,
      customer,
      concessions,
      isLoyaltyMember: req.user.isLoyaltyMember || false
    };
    
    console.log('e')
    const booking = await bookingService.createBooking(bookingData, userId);
    
    console.log('f')
    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
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
    const userId = req.user?._id; 
    const booking = await bookingService.getBookingByReference(req.params.id, userId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you are not authorized to view this booking'
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
    const userId = req.user._id;
    console.log("This is the user id:", userId)
    const booking = await bookingService.cancelBooking(req.params.id, userId);
    
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

async function getUserBookings(req, res) {
  try {
    console.log('=== DEBUG: getUserBookings called ===');
    console.log('User ID from token:', req.user._id);
    console.log('User ID type:', typeof req.user._id);

    const userId = req.user._id;
    const bookings = await bookingService.getUserBookings(userId);
    console.log("Bookings:", bookings)
    
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message
    });
  }
}

async function getEventAvailability(req, res) {
  try {
    const { eventId } = req.params;
    const availability = await bookingService.getEventAvailability(eventId);
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking event availability',
      error: error.message
    });
  }
}

module.exports = {
  createBooking,
  getBooking,
  cancelBooking,
  getUserBookings,
  getEventAvailability
};