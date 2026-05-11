const express = require('express');
const router = express.Router();
const { 
  createProject, 
  getMyProjects, 
  getProjectProposals, 
  acceptProposal, 
  getProjectDetails, 
  analyzeProposals,
  generateProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone
} = require('../controllers/projectController');
const { protect } = require('../middlewares/authMiddleware');

// Créer un nouveau projet (ex: après le brief IA)
router.post('/', protect, createProject);

// Récupérer la liste de ses projets
router.get('/', protect, getMyProjects);

// Détails d'un projet spécifique
router.get('/:id', protect, getProjectDetails);

// Propositions pour un projet spécifique (Client seul)
router.get('/:id/proposals', protect, getProjectProposals);

// Accepter une proposition
router.post('/:id/proposals/:proposalId/accept', protect, acceptProposal);

// Analyser les propositions via IA
router.post('/:id/analyze-proposals', protect, analyzeProposals);
router.post('/:id/generate-milestones', protect, generateProjectMilestones);
router.post('/:id/milestones', protect, createMilestone);
router.patch('/milestones/:milestoneId', protect, updateMilestone);
router.delete('/milestones/:milestoneId', protect, deleteMilestone);

module.exports = router;
