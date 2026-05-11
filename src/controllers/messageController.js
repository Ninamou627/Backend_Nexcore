const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getProjectMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Vérifier si l'utilisateur est le client ou l'expert du projet
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || (project.clientId !== userId && project.expertId !== userId)) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const messages = await prisma.message.findMany({
      where: { projectId },
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
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages.' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || (project.clientId !== senderId && project.expertId !== senderId)) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const message = await prisma.message.create({
      data: {
        content,
        projectId,
        senderId
      },
      include: {
        sender: {
          select: {
            fullName: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du message.' });
  }
};

module.exports = { getProjectMessages, sendMessage };
