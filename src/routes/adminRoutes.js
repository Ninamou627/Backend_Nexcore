const express = require('express');
const router = express.Router();
const { 
  getAdminStats, 
  getPendingExperts, 
  verifyExpert, 
  getAllProjects 
} = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');

// Middleware pour restreindre l'accès aux admins uniquement
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
};

router.get('/stats', protect, adminOnly, getAdminStats);
router.get('/experts/pending', protect, adminOnly, getPendingExperts);
router.patch('/experts/:id/verify', protect, adminOnly, verifyExpert);
router.get('/projects', protect, adminOnly, getAllProjects);

module.exports = router;
