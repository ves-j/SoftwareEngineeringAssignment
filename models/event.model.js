// models/event.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  eventDate: {
    type: Date,
    required: true
  },
  eventType: {
    type: String,
    enum: ['matinee', 'evening'],
    required: true
  },
  releaseDate: {
    type: Date,
    required: true
  },
  imageUrl: {
    type: String
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);