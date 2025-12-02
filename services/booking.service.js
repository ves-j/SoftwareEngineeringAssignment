const Booking = require('../models/booking.model');
const Seat = require('../models/seat.model');
const Event = require('../models/event.model');
const pricingService = require('./pricing.service');

class BookingService {
  async createBooking(bookingData, userId) {
    try {
      // Check if event exists and is active
      const event = await Event.findById(bookingData.eventId);
      if (!event || !event.isActive) {
        throw new Error('Event not found or is no longer available');
      }
      
      // Check if event is sold out
      const totalSeats = await Seat.countDocuments();
      const bookedSeats = await Booking.countDocuments({ 
        event: bookingData.eventId,
        status: { $ne: 'cancelled' }
      });
      
      if (bookedSeats >= totalSeats) {
        throw new Error('This event is completely sold out');
      }
      
      // Check seat availability
      const seats = await Seat.find({ _id: { $in: bookingData.seatIds } });
      if (seats.length !== bookingData.seatIds.length) {
        throw new Error('One or more seats not found');
      }
      
      const unavailableSeats = seats.filter(seat => !seat.isAvailable);
      if (unavailableSeats.length > 0) {
        throw new Error(`Seats ${unavailableSeats.map(s => s.seatNumber).join(', ')} are already booked`);
      }
      
      // Check if any seat is being double-booked (race condition prevention)
      const seatUpdate = await Seat.updateMany(
        { 
          _id: { $in: bookingData.seatIds },
          isAvailable: true 
        },
        { $set: { isAvailable: false } }
      );
      
      if (seatUpdate.modifiedCount !== bookingData.seatIds.length) {
        // Some seats were booked by someone else in the meantime
        throw new Error('Some seats were just booked by another user. Please try different seats.');
      }
      
      // Generate unique booking reference
      const bookingReference = this.generateBookingReference();
      
      // Calculate total price
      const totalAmount = pricingService.calculateTotalPrice(
        seats,
        event.basePrice,
        event.eventType,
        bookingData.concessions,
        bookingData.isLoyaltyMember
      );
      
      // Check group discount eligibility
      const finalConcessions = [...bookingData.concessions];
      if (bookingData.seatIds.length >= 10) {
        finalConcessions.push('group');
      }
      
      // Create booking with user association
      const booking = new Booking({
        bookingReference,
        event: bookingData.eventId,
        user: userId, // Associate booking with user
        customer: bookingData.customer,
        seats: seats.map(seat => ({
          seat: seat._id,
          price: pricingService.calculateSeatPrice(
            event.basePrice,
            event.eventType,
            seat.section,
            seat.row,
            seat.seatNumber,
            pricingService.getBestConcession(finalConcessions),
            bookingData.isLoyaltyMember
          ),
          concessionType: pricingService.getBestConcession(finalConcessions)
        })),
        totalAmount,
        loyaltyDiscount: bookingData.isLoyaltyMember,
        status: 'confirmed' // Changed from pending to confirmed
      });
      
      await booking.save();
      
      // Send booking confirmation email (you can implement this)
      // await this.sendBookingConfirmation(booking, bookingData.customer.email);
      
      return booking;
    } catch (error) {
      // If booking fails, release the seats
      await Seat.updateMany(
        { _id: { $in: bookingData.seatIds } },
        { $set: { isAvailable: true } }
      );
      throw error;
    }
  }

  generateBookingReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `VH${timestamp}${random}`.toUpperCase();
  }

  async getBookingByReference(bookingReference, userId = null) {
    const query = { bookingReference };
    
    // If userId provided, ensure user can only access their own bookings
    if (userId) {
      query.user = userId;
    }
    
    return await Booking.findOne(query)
      .populate('event')
      .populate('seats.seat')
      .populate('user', 'name email');
  }

  async getUserBookings(userId) {
    return await Booking.find({ user: userId })
      .populate('event')
      .populate('seats.seat')
      .sort({ createdAt: -1 });
  }

  async cancelBooking(bookingReference, userId) {
    const booking = await Booking.findOne({ 
      bookingReference,
      user: userId // Ensure user can only cancel their own bookings
    });
    
    if (!booking) {
      throw new Error('Booking not found or you are not authorized to cancel this booking');
    }
    
    // Check if cancellation is allowed (e.g., within 24 hours of event)
    const eventDate = booking.event.eventDate;
    const now = new Date();
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilEvent < 24) {
      throw new Error('Cancellation not allowed within 24 hours of the event');
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

  async getEventAvailability(eventId) {
    const totalSeats = await Seat.countDocuments();
    const bookedSeats = await Booking.countDocuments({ 
      event: eventId,
      status: { $ne: 'cancelled' }
    });
    
    const availableSeats = totalSeats - bookedSeats;
    
    return {
      totalSeats,
      bookedSeats,
      availableSeats,
      isSoldOut: availableSeats === 0,
      percentageBooked: Math.round((bookedSeats / totalSeats) * 100)
    };
  }
}

module.exports = new BookingService();