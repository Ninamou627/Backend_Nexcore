const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Récupérer les projets ouverts au matching
const getMarketplaceProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: 'matching',
        expertId: null
      },
      include: {
        client: {
          select: {
            fullName: true,
            company: true
          }
        },
        _count: {
          select: { proposals: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Ajouter le flag hasApplied pour l'expert connecté
    const projectsWithStatus = await Promise.all(projects.map(async (project) => {
      let hasApplied = false;
      if (req.user && req.user.role === 'EXPERT') {
        const proposal = await prisma.proposal.findFirst({
          where: {
            projectId: project.id,
            expertId: req.user.id
          }
        });
        hasApplied = !!proposal;
      }
      return { ...project, hasApplied };
    }));

    res.json(projectsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération du marketplace.' });
  }
};
const getProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            fullName: true,
            company: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé.' });
    }

    // Vérifier si l'expert actuel a déjà postulé
    let hasApplied = false;
    if (req.user && req.user.role === 'EXPERT') {
      const proposal = await prisma.proposal.findFirst({
        where: {
          projectId: id,
          expertId: req.user.id
        }
      });
      hasApplied = !!proposal;
    }

    res.json({ ...project, hasApplied });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération du projet.' });
  }
};

// Soumettre une proposition
const submitProposal = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { approach, timeline, proposedPrice, methodology, experience } = req.body;
    const expertId = req.user.id;

    // Vérifier si le projet existe et est ouvert
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || project.status !== 'matching') {
      return res.status(400).json({ message: 'Ce projet n\'est plus ouvert aux propositions.' });
    }

    // Vérifier si l'expert a déjà postulé
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        projectId,
        expertId
      }
    });

    if (existingProposal) {
      return res.status(400).json({ message: 'Vous avez déjà soumis une proposition pour ce projet.' });
    }

    const proposal = await prisma.proposal.create({
      data: {
        approach,
        timeline,
        proposedPrice,
        methodology,
        experience,
        projectId,
        expertId
      }
    });

    res.status(201).json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la soumission de la proposition.' });
  }
};

module.exports = {
  getMarketplaceProjects,
  getProjectDetails,
  submitProposal
};
