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
  deleteMilestone,
  updateProject
} = require('../controllers/projectController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Créer un nouveau projet (ex: après le brief IA)
router.post('/', protect, restrictTo('CLIENT'), createProject);

// Récupérer la liste de ses projets
router.get('/', protect, getMyProjects);

// Détails d'un projet spécifique
router.get('/:id', protect, getProjectDetails);

// Mettre à jour le projet (statut, githubRepoUrl, etc.)
router.patch('/:id', protect, updateProject);

// Propositions pour un projet spécifique (Client seul)
router.get('/:id/proposals', protect, restrictTo('CLIENT'), getProjectProposals);

// Accepter une proposition
router.post('/:id/proposals/:proposalId/accept', protect, restrictTo('CLIENT'), acceptProposal);

// Analyser les propositions via IA
router.post('/:id/analyze-proposals', protect, restrictTo('CLIENT'), analyzeProposals);

// Milestones (Gestion par l'Expert ou Admin)
router.post('/:id/generate-milestones', protect, restrictTo('EXPERT', 'ADMIN'), generateProjectMilestones);
router.post('/:id/milestones', protect, restrictTo('EXPERT', 'ADMIN'), createMilestone);
router.patch('/milestones/:milestoneId', protect, restrictTo('EXPERT', 'ADMIN'), updateMilestone);
router.delete('/milestones/:milestoneId', protect, restrictTo('EXPERT', 'ADMIN'), deleteMilestone);

module.exports = router;
