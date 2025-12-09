const express = require('express');
const router = express.Router();
const {
  sendPhoneVerification,
  verifyPhoneNumber,
  register,
  login,
  checkPhoneExists,
  completeProfile,
  getMe,
  changePin
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');

// Public routes
router.post('/send-verification', sendPhoneVerification);
router.post('/verify-phone', verifyPhoneNumber);
router.post('/register', register);
router.post('/login', login);
router.post('/check-phone', checkPhoneExists);

// Protected routes
router.use(protect); // All routes below this middleware are protected
router.get('/me', getMe);
router.put('/complete-profile', uploadProfileImage, completeProfile);
router.put('/change-pin', changePin);

module.exports = router;
