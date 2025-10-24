const express = require('express');
const router = express.Router();
const {
  sendPhoneVerification,
  verifyPhoneNumber,
  register,
  login,
  completeProfile,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/send-verification', sendPhoneVerification);
router.post('/verify-phone', verifyPhoneNumber);
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(protect); // All routes below this middleware are protected
router.get('/me', getMe);
router.put('/complete-profile', completeProfile);

module.exports = router;
