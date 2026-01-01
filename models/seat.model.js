const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const seatSchema = new Schema({
  seatNumber: {
    type: String,
    required: true
  },
  row: {
    type: String,
    required: true
  },
  section: {
    type: String,
    enum: ['stalls', 'circle', 'upperCircle'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  // x: Number,
  // y: Number
}, {
  timestamps: true
});

module.exports = mongoose.model('Seat', seatSchema);