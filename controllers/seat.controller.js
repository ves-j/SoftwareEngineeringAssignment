const seatService = require('../services/seat.service');
const Event = require('../models/event.model');
const pricingService = require('../services/pricing.service');

// async function getAvailableSeats(req, res) {
//   try {
//     const { eventId, section } = req.query;
//     const event = await Event.findById(eventId);
    
//     if (!event) {
//       return res.status(404).json({
//         success: false,
//         message: 'Event not found'
//       });
//     }
    
//     const seats = await seatService.getAvailableSeats(eventId, section);
    
//     // Add pricing information to each seat
//     const seatsWithPricing = seats.map(seat => ({
//       ...seat.toObject(),
//       price: pricingService.calculateSeatPrice(
//         event.basePrice,
//         event.eventType,
//         seat.section,
//         seat.row,
//         seat.seatNumber
//       )
//     }));
    
//     res.json({
//       success: true,
//       data: seatsWithPricing
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching seats',
//       error: error.message
//     });
//   }
// }

async function getAvailableSeats(req, res) {
  try {
    const { eventId, section } = req.query;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'eventId query parameter is required'
      });
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const seats = await seatService.getAvailableSeats(eventId, section);
    
    // Add pricing information to each seat
    const seatsWithPricing = seats.map(seat => ({
      ...seat.toObject(),
      price: pricingService.calculateSeatPrice(
        event.basePrice,
        event.eventType,
        seat.section,
        seat.row,
        seat.seatNumber
      )
    }));
    
    // Also get availability statistics
    const bookingService = require('../services/booking.service');
    const availability = await bookingService.getEventAvailability(eventId);
    
    res.json({
      success: true,
      data: {
        seats: seatsWithPricing,
        availability: {
          total: availability.totalSeats,
          available: availability.availableSeats,
          booked: availability.bookedSeats,
          percentageBooked: availability.percentageBooked,
          isSoldOut: availability.isSoldOut
        },
        event: {
          id: event._id,
          title: event.title,
          eventDate: event.eventDate,
          eventType: event.eventType,
          basePrice: event.basePrice
        }
      }
    });
  } catch (error) {
    console.error('Error in getAvailableSeats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching seats',
      error: error.message
    });
  }
}


async function initializeTheater(req, res) {
  try {
    await seatService.initializeTheaterLayout();
    
    res.json({
      success: true,
      message: 'Theater layout initialized successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error initializing theater',
      error: error.message
    });
  }
}

async function getSeatPricing(req, res) {
  try {
    const { eventId, seatId } = req.params;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('A')
    
    const price = await seatService.getSeatPricing(seatId, event);
    
    res.json({
      success: true,
      data: { price }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating price',
      error: error.message
    });
  }
}

module.exports = {
  getAvailableSeats,
  initializeTheater,
  getSeatPricing
};