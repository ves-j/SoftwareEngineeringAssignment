const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true
  },
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  seats: [{
    seat: {
      type: Schema.Types.ObjectId,
      ref: 'Seat'
    },
    price: Number,
    concessionType: {
      type: String,
      enum: ['adult', 'child', 'senior', 'group'],
      default: 'adult'
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  loyaltyDiscount: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  bookingDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);