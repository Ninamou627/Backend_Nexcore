const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateAuditReport } = require('../services/aiService');

const generateAudit = async (req, res) => {
  try {
    const { projectId } = req.params;
    const expertId = req.user.id;

    // 1. Récupérer les données du projet
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: true,
        files: true,
        client: { select: { fullName: true, company: true } }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Projet introuvable.' });
    }

    if (project.expertId !== expertId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas l\'expert de ce projet.' });
    }

    if (project.files.length === 0 && !project.githubRepoUrl) {
      return res.status(400).json({ message: 'Impossible de générer un audit : aucun fichier ni dépôt GitHub n\'a été fourni pour l\'analyse.' });
    }

    // 2. Générer l'audit via l'IA
    const aiAnalysis = await generateAuditReport(project);

    // 3. Créer l'entrée Audit en BDD
    const audit = await prisma.audit.create({
      data: {
        projectId,
        expertId,
        securityScore: aiAnalysis.securityScore,
        qualityScore: aiAnalysis.qualityScore,
        conformityScore: aiAnalysis.conformityScore,
        aiReport: aiAnalysis.report,
        status: 'PENDING'
      }
    });

    res.status(201).json(audit);
  } catch (error) {
    console.error('Erreur génération audit:', error);
    res.status(500).json({ message: 'Erreur lors de la génération de l\'audit.' });
  }
};

const getProjectAudits = async (req, res) => {
  try {
    const { projectId } = req.params;

    const audits = await prisma.audit.findMany({
      where: { projectId },
      include: {
        expert: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(audits);
  } catch (error) {
    console.error('Erreur récupération audits:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des audits.' });
  }
};

const updateAudit = async (req, res) => {
  try {
    const { auditId } = req.params;
    const { securityScore, qualityScore, conformityScore, expertComments, status } = req.body;
    const expertId = req.user.id;

    const existingAudit = await prisma.audit.findUnique({ where: { id: auditId } });

    if (!existingAudit) {
      return res.status(404).json({ message: 'Audit introuvable.' });
    }

    if (existingAudit.expertId !== expertId) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    const updatedAudit = await prisma.audit.update({
      where: { id: auditId },
      data: {
        securityScore,
        qualityScore,
        conformityScore,
        expertComments,
        status
      }
    });

    res.json(updatedAudit);
  } catch (error) {
    console.error('Erreur mise à jour audit:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'audit.' });
  }
};

module.exports = {
  generateAudit,
  getProjectAudits,
  updateAudit
};
