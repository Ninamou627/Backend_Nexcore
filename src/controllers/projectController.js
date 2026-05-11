const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createProject = async (req, res) => {
  try {
    const { title, description, budget, timeline, techStack } = req.body;
    
    // Le client connecté est celui qui crée le projet
    const clientId = req.user.id;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        budget,
        timeline,
        techStack,
        clientId,
        status: 'matching', // statut par défaut
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création du projet.' });
  }
};

const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let projects = [];
    if (role === 'CLIENT') {
      projects = await prisma.project.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === 'EXPERT') {
      projects = await prisma.project.findMany({
        where: { expertId: userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des projets.' });
  }
};

const getProjectProposals = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;

    // Vérifier que le projet appartient au client
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        proposals: {
          include: {
            expert: {
              select: {
                id: true,
                fullName: true,
                company: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!project || project.clientId !== clientId) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    res.json(project.proposals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des propositions.' });
  }
};

const acceptProposal = async (req, res) => {
  try {
    const { id, proposalId } = req.params;
    const clientId = req.user.id;

    // Vérifier que le projet appartient au client
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project || project.clientId !== clientId) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    // Vérifier la proposition
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal || proposal.projectId !== id) {
      return res.status(400).json({ message: 'Proposition invalide.' });
    }

    // Mettre à jour le projet et les propositions
    await prisma.$transaction([
      // Assigner l'expert au projet
      prisma.project.update({
        where: { id },
        data: {
          expertId: proposal.expertId,
          budget: proposal.proposedPrice,
          status: 'in_progress'
        }
      }),
      // Marquer la proposition comme acceptée
      prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'accepted' }
      }),
      // Marquer les autres propositions comme rejetées
      prisma.proposal.updateMany({
        where: {
          projectId: id,
          id: { not: proposalId }
        },
        data: { status: 'rejected' }
      })
    ]);

    res.json({ message: 'Proposition acceptée. Le projet est maintenant en cours.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de l\'acceptation de la proposition.' });
  }
};

const submitProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const expertId = req.user.id;
    const { approach, timeline, budget, methodology, experience } = req.body;

    if (req.user.role !== 'EXPERT') {
      return res.status(403).json({ message: 'Seuls les experts peuvent soumettre des propositions.' });
    }

    // Vérifier si une proposition existe déjà
    const existing = await prisma.proposal.findFirst({
      where: { projectId: id, expertId }
    });

    if (existing) {
      return res.status(400).json({ message: 'Vous avez déjà soumis une proposition pour ce projet.' });
    }

    const proposal = await prisma.proposal.create({
      data: {
        projectId: id,
        expertId,
        approach,
        timeline,
        budget,
        methodology,
        experience,
        status: 'pending'
      }
    });

    res.status(201).json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la soumission de la proposition.' });
  }
};

const getProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            fullName: true,
            company: true
          }
        },
        expert: {
          select: {
            fullName: true,
            company: true
          }
        },
        milestones: {
          orderBy: { createdAt: 'asc' }
        },
        messages: {
          include: {
            sender: {
              select: {
                fullName: true,
                avatar: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé.' });
    }

    // Vérifier les permissions
    if (role === 'CLIENT' && project.clientId !== userId) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    if (role === 'EXPERT' && project.expertId !== userId) {
      // Un expert peut voir le projet s'il y est assigné
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération du projet.' });
  }
};

const aiService = require('../services/aiService'); // Force reload controller

const analyzeProposals = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        proposals: {
          include: {
            expert: {
              select: {
                fullName: true,
                experience: true,
                skills: true
              }
            }
          }
        }
      }
    });

    if (!project || project.clientId !== clientId) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    if (project.proposals.length === 0) {
      return res.status(400).json({ message: 'Aucune proposition à analyser.' });
    }

    const analysis = await aiService.analyzeProposals(project, project.proposals);
    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de l\'analyse des propositions par l\'IA.' });
  }
};

const createMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, deliverables, dueDate } = req.body;
    const userId = req.user.id;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project || project.expertId !== userId) {
      return res.status(403).json({ message: 'Seul l\'expert assigné peut créer des jalons.' });
    }

    const milestone = await prisma.milestone.create({
      data: {
        title,
        description,
        amount: parseFloat(amount),
        deliverables,
        projectId: id,
        dueDate: new Date(dueDate),
        status: 'pending'
      }
    });

    res.status(201).json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création du jalon.' });
  }
};

const updateMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { title, description, amount, deliverables, dueDate, status } = req.body;
    const userId = req.user.id;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true }
    });

    const isExpert = milestone.project.expertId === userId;
    const isClient = milestone.project.clientId === userId;

    if (!milestone || (!isExpert && !isClient)) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    // Un client ne peut QUE bloquer les fonds (passer à funded)
    if (isClient && !isExpert && status !== 'funded') {
      return res.status(403).json({ message: 'Action non autorisée.' });
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        deliverables,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du jalon.' });
  }
};

const deleteMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const userId = req.user.id;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true }
    });

    if (!milestone || milestone.project.expertId !== userId) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    await prisma.milestone.delete({
      where: { id: milestoneId }
    });

    res.json({ message: 'Jalon supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression du jalon.' });
  }
};

const generateProjectMilestones = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        proposals: {
          where: { status: 'accepted' }
        }
      }
    });

    if (!project || project.expertId !== userId) {
      return res.status(403).json({ message: 'Seul l\'expert assigné peut générer des jalons.' });
    }

    if (project.proposals.length === 0) {
      return res.status(400).json({ message: 'Aucune proposition acceptée pour ce projet.' });
    }

    const milestones = await aiService.generateMilestones(project, project.proposals[0]);
    res.json(milestones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la génération des jalons.' });
  }
};

module.exports = {
  createProject,
  getMyProjects,
  getProjectDetails,
  getProjectProposals,
  acceptProposal,
  submitProposal,
  analyzeProposals,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  generateProjectMilestones
};
