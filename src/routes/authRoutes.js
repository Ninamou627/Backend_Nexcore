const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getMe, 
  setup2FA, 
  verifyAndEnable2FA, 
  disable2FA,
  verifyLogin2FA,
  logoutUser
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/login-2fa', verifyLogin2FA);
router.get('/me', protect, getMe);

// 2FA Routes
router.get('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verifyAndEnable2FA);
router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
