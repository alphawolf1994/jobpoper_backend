const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const TwilioService = require('../services/twilioService');
const { generateToken } = require('../middleware/auth');

// @desc    Send phone verification code
// @route   POST /api/auth/send-verification
// @access  Public
const sendPhoneVerification = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number is required'
    });
  }

  // Check if phone number already exists
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number already registered'
    });
  }

  try {
    const result = await TwilioService.sendVerificationCode(phoneNumber);
    
    res.status(200).json({
      status: 'success',
      message: 'Verification code sent successfully',
      data: {
        phoneNumber,
        twilioSid: result.twilioSid
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @desc    Verify phone number
// @route   POST /api/auth/verify-phone
// @access  Public
const verifyPhoneNumber = asyncHandler(async (req, res) => {
  const { phoneNumber, verificationCode } = req.body;

  if (!phoneNumber || !verificationCode) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number and verification code are required'
    });
  }

  try {
    const result = await TwilioService.verifyCode(phoneNumber, verificationCode);
    
    res.status(200).json({
      status: 'success',
      message: 'Phone number verified successfully',
      data: {
        phoneNumber,
        isVerified: true
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// @desc    Register user with phone and PIN
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { phoneNumber, pin } = req.body;

  if (!phoneNumber || !pin) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number and PIN are required'
    });
  }

  // Validate PIN format
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({
      status: 'error',
      message: 'PIN must be exactly 4 digits'
    });
  }

  // Check if phone number is verified
  const isVerified = await TwilioService.isPhoneVerified(phoneNumber);
  if (!isVerified) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number must be verified before registration'
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User already exists with this phone number'
    });
  }

  try {
    // Create user
    const user = await User.create({
      phoneNumber,
      pin,
      isPhoneVerified: true
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          isPhoneVerified: user.isPhoneVerified,
          isProfileComplete: user.profile.isProfileComplete,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create user account'
    });
  }
});

// @desc    Login user with phone and PIN
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { phoneNumber, pin } = req.body;

  if (!phoneNumber || !pin) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number and PIN are required'
    });
  }

  // Find user by phone number
  const user = await User.findOne({ phoneNumber });

  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      status: 'error',
      message: 'Account is deactivated'
    });
  }

  // Verify PIN
  const isPinValid = await user.comparePin(pin);
  if (!isPinValid) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = generateToken(user._id);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
        isProfileComplete: user.profile.isProfileComplete,
        role: user.role
      }
    }
  });
});

// @desc    Complete user profile
// @route   PUT /api/auth/complete-profile
// @access  Private
const completeProfile = asyncHandler(async (req, res) => {
  const { fullName, email, location, dateOfBirth } = req.body;

  const user = req.user;

  // Validate required fields
  if (!fullName || !email) {
    return res.status(400).json({
      status: 'error',
      message: 'Full name and email are required'
    });
  }

  try {
    // Validate email format if provided
    if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter a valid email address'
      });
    }

    // Update profile
    user.profile.fullName = fullName;
    user.profile.email = email;
    user.profile.location = location || user.profile.location;
    user.profile.dateOfBirth = dateOfBirth || user.profile.dateOfBirth;
    // If a file was uploaded and processed, use that; otherwise keep existing value
    if (req.processedFileName) {
      user.profile.profileImage = `profiles/${req.processedFileName}`;
    }
    user.profile.isProfileComplete = true;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile completed successfully',
      data: {
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          profile: user.profile,
          isProfileComplete: user.profile.isProfileComplete,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
        profile: user.profile,
        role: user.role,
        lastLogin: user.lastLogin
      }
    }
  });
});

module.exports = {
  sendPhoneVerification,
  verifyPhoneNumber,
  register,
  login,
  completeProfile,
  getMe
};
