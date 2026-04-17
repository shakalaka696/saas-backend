const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// CR1: Customer Registration
router.post('/register', publicController.registerCustomer);

// CR2: OTP Verification
router.post('/verify-otp', publicController.verifyOtp);

router.post('/resend-otp', publicController.resendOtp);

module.exports = router;