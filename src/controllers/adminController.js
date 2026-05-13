const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAdminStats = async (req, res) => {
  try {
    const totalProjects = await prisma.project.count();
    const activeProjects = await prisma.project.count({
      where: { status: 'in_progress' }
    });
    const totalExperts = await prisma.user.count({
      where: { role: 'EXPERT' }
    });
    const verifiedExperts = await prisma.user.count({
      where: { role: 'EXPERT', isVerified: true }
    });
    const totalClients = await prisma.user.count({
      where: { role: 'CLIENT' }
    });

    // Calculer le volume d'affaires (somme des budgets acceptés)
    const projectsWithBudget = await prisma.project.findMany({
      where: { budget: { not: null } },
      select: { budget: true }
    });

    const totalVolume = projectsWithBudget.reduce((acc, p) => {
      const amount = parseFloat(p.budget.replace(/[^0-9.]/g, '')) || 0;
      return acc + amount;
    }, 0);

    res.json({
      totalProjects,
      activeProjects,
      totalExperts,
      verifiedExperts,
      totalClients,
      totalVolume
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques.' });
  }
};

const getPendingExperts = async (req, res) => {
  try {
    const experts = await prisma.user.findMany({
      where: { role: 'EXPERT', isVerified: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json(experts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des experts.' });
  }
};

const verifyExpert = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { isVerified: true }
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la vérification de l\'expert.' });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: { select: { fullName: true, company: true } },
        expert: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des projets.' });
  }
};

module.exports = {
  getAdminStats,
  getPendingExperts,
  verifyExpert,
  getAllProjects
};
