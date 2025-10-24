const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  pin: {
    type: String,
    required: [true, 'PIN is required']
  },
  profile: {
    fullName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, 'Full name cannot be more than 100 characters']
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot be more than 200 characters']
    },
    dateOfBirth: {
      type: Date
    },
    profileImage: {
      type: String
    },
    isProfileComplete: {
      type: Boolean,
      default: false
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash PIN before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  
  // Validate PIN format before hashing
  if (!/^\d{4}$/.test(this.pin)) {
    return next(new Error('PIN must be exactly 4 digits'));
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare PIN method
userSchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

// Index for better performance
userSchema.index({ phoneNumber: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
