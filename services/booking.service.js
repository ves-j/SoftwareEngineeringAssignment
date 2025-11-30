// services/booking.service.js
const Booking = require('../models/booking.model');
const Seat = require('../models/seat.model');
const pricingService = require('./pricing.service');

class BookingService {
  async createBooking(bookingData) {
    try {
      // Generate unique booking reference
      const bookingReference = this.generateBookingReference();
      
      // Check seat availability
      const seats = await Seat.find({ _id: { $in: bookingData.seatIds } });
      const unavailableSeats = seats.filter(seat => !seat.isAvailable);
      
      if (unavailableSeats.length > 0) {
        throw new Error(`Seats ${unavailableSeats.map(s => s.seatNumber).join(', ')} are not available`);
      }
      
      // Calculate total price
      const event = bookingData.event;
      const totalAmount = pricingService.calculateTotalPrice(
        seats,
        event.basePrice,
        event.eventType,
        bookingData.concessions,
        bookingData.isLoyaltyMember
      );
      
      // Create booking
      const booking = new Booking({
        bookingReference,
        event: bookingData.eventId,
        customer: bookingData.customer,
        seats: seats.map(seat => ({
          seat: seat._id,
          price: pricingService.calculateSeatPrice(
            event.basePrice,
            event.eventType,
            seat.section,
            seat.row,
            seat.seatNumber,
            pricingService.getBestConcession(bookingData.concessions),
            bookingData.isLoyaltyMember
          ),
          concessionType: pricingService.getBestConcession(bookingData.concessions)
        })),
        totalAmount,
        loyaltyDiscount: bookingData.isLoyaltyMember
      });
      
      await booking.save();
      
      // Update seat availability
      await Seat.updateMany(
        { _id: { $in: bookingData.seatIds } },
        { $set: { isAvailable: false } }
      );
      
      return booking;
    } catch (error) {
      throw error;
    }
  }

  generateBookingReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `VH${timestamp}${random}`.toUpperCase();
  }

  async getBookingByReference(bookingReference) {
    return await Booking.findOne({ bookingReference })
      .populate('event')
      .populate('seats.seat');
  }

  async cancelBooking(bookingReference) {
    const booking = await Booking.findOne({ bookingReference });
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    booking.status = 'cancelled';
    await booking.save();
    
    // Free up the seats
    const seatIds = booking.seats.map(seat => seat.seat);
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { isAvailable: true } }
    );
    
    return booking;
  }
}

module.exports = new BookingService();