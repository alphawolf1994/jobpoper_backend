const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [100, 'Location name cannot be more than 100 characters']
  },
  fullAddress: {
    type: String,
    required: [true, 'Full address is required'],
    trim: true
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },
  addressDetails: {
    type: String,
    trim: true,
    maxlength: [500, 'Address details cannot be more than 500 characters']
  },
  createdAt: {
    type: Number,
    default: () => Date.now()
  }
}, {
  timestamps: true
});

// Compound index to ensure unique location name per user
locationSchema.index({ user: 1, name: 1 }, { unique: true });

// Index for efficient querying by user
locationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Location', locationSchema);

