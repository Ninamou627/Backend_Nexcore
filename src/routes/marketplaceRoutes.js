const express = require('express');
const router = express.Router();
const { getMarketplaceProjects, getProjectDetails, submitProposal } = require('../controllers/marketplaceController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Toutes les routes du marketplace sont réservées aux experts
router.use(protect);
router.use(restrictTo('EXPERT'));

router.get('/', getMarketplaceProjects);
router.get('/:id', getProjectDetails);
router.post('/:projectId/proposals', submitProposal);

module.exports = router;
