const express = require('express');
const router = express.Router();
const { generateAudit, getProjectAudits, updateAudit } = require('../controllers/auditController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.post('/project/:projectId/generate', protect, restrictTo('EXPERT', 'ADMIN'), generateAudit);
router.get('/project/:projectId', protect, getProjectAudits);
router.patch('/:auditId', protect, restrictTo('EXPERT', 'ADMIN'), updateAudit);

module.exports = router;
