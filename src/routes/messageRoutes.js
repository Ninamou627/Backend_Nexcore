const express = require('express');
const router = express.Router();
const { getProjectMessages, sendMessage } = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/:projectId', protect, getProjectMessages);
router.post('/:projectId', protect, sendMessage);

module.exports = router;
