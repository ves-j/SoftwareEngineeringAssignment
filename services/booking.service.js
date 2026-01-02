const Booking = require('../models/booking.model');
const Seat = require('../models/seat.model');
const Event = require('../models/event.model');
const pricingService = require('./pricing.service');

class BookingService {
  async createBooking(bookingData, userId) {
    try {
      const event = await Event.findById(bookingData.eventId);
      if (!event || !event.isActive) {
        throw new Error('Event not found or is no longer available');
      }


      const totalSeats = await Seat.countDocuments();


      const availability = await this.getEventAvailability(bookingData.eventId);
      if (availability.isSoldOut) {
        throw new Error('This event is completely sold out');
      }

      // Validate seats exist
      const seats = await Seat.find({ _id: { $in: bookingData.seatIds } });
      if (seats.length !== bookingData.seatIds.length) {
        throw new Error('One or more seats not found');
      }

      // Check event-specific seat availability
      const seatService = require('./seat.service');
      const availabilityCheck = await seatService.areSeatsAvailableForEvent(
        bookingData.seatIds,
        bookingData.eventId
      );

      if (!availabilityCheck.allAvailable) {
        const seatInfo = availabilityCheck.unavailableSeats
          .map(s => `${s.row}${s.seatNumber} (${s.section})`)
          .join(', ');
        throw new Error(`Seats ${seatInfo} are already booked for this event`);
      }

      const bookingReference = this.generateBookingReference();

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

      console.log("Creating booking for user ID:", userId);

      const booking = new Booking({
        bookingReference,
        event: bookingData.eventId,
        user: userId,
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
        status: 'confirmed'
      });

      await booking.save();
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

  async getBookingByReference(bookingReference, userId = null) {
    const query = { _id: bookingReference };

    if (userId) {
      query.user = userId;
    }

    console.log("The request got here ");
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
      _id: bookingReference,
      user: userId
    });

    if (!booking) {
      throw new Error('Booking not found or you are not authorized to cancel this booking');
    }

    await booking.populate('event');
    const eventDate = booking.event.eventDate;
    const now = new Date();
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
      throw new Error('Cancellation not allowed within 24 hours of the event');
    }

    booking.status = 'cancelled';
    await booking.save();

    return booking;
  }


  async getEventAvailability(eventId) {
    const totalSeats = await Seat.countDocuments();


    const eventBookings = await Booking.find({
      event: eventId,
      status: { $ne: 'cancelled' }
    }).select('seats.seat');


    const bookedSeatIds = new Set();
    eventBookings.forEach(booking => {
      (booking.seats || []).forEach(seatBooking => {
        if (seatBooking?.seat) bookedSeatIds.add(seatBooking.seat.toString());
      });
    });

    const bookedSeats = bookedSeatIds.size;
    const availableSeats = Math.max(totalSeats - bookedSeats, 0);

    const pctRaw = totalSeats ? (bookedSeats / totalSeats) * 100 : 0;
    const percentageBooked = Math.round(pctRaw * 10) / 10; 

    return {
      totalSeats,
      bookedSeats,
      availableSeats,
      isSoldOut: availableSeats === 0,
      percentageBooked
    };
  }
}

module.exports = new BookingService();
