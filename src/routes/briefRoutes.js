const express = require('express');
const router = express.Router();
const multer = require('multer');
const { chatWithAI, handleVoiceChat } = require('../controllers/briefController');
const { protect } = require('../middlewares/authMiddleware');

const upload = multer({ dest: 'uploads/' });

// On protège la route pour que seuls les utilisateurs connectés puissent utiliser l'IA
router.post('/chat', protect, chatWithAI);

// Route vocale
router.post('/voice', protect, upload.single('audio'), handleVoiceChat);

module.exports = router;
