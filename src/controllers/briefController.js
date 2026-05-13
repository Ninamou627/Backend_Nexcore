const { generateChatResponse, generateContextualResponse, transcribeAudio } = require('../services/aiService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

// Charger les données du client pour le contexte IA
const getClientContext = async (userId) => {
  const projects = await prisma.project.findMany({
    where: { clientId: userId },
    include: {
      expert: { select: { fullName: true, email: true } },
      proposals: { select: { id: true, status: true, proposedPrice: true, expert: { select: { fullName: true } } } },
      milestones: { select: { title: true, status: true, amount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true, company: true, createdAt: true }
  });

  return { user, projects };
};

// Charger les données de l'expert pour le contexte IA
const getExpertContext = async (userId) => {
  const projects = await prisma.project.findMany({
    where: { expertId: userId },
    include: {
      client: { select: { fullName: true, company: true } },
      milestones: { select: { title: true, status: true, amount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const proposals = await prisma.proposal.findMany({
    where: { expertId: userId },
    include: {
      project: { select: { title: true, status: true, budget: true } }
    },
    orderBy: { createdAt: 'desc' },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true, skills: true, experience: true, isVerified: true }
  });

  return { user, projects, proposals };
};

// Exécuter les actions décidées par l'IA
const executeActions = async (actions, userId) => {
  const results = [];

  for (const action of actions) {
    try {
      switch (action.tool) {
        case 'send_message_to_expert': {
          const { projectId, message } = action.args;
          const newMessage = await prisma.message.create({
            data: {
              content: message,
              projectId,
              senderId: userId,
            }
          });
          results.push({ tool: action.tool, success: true, data: { messageId: newMessage.id } });
          break;
        }

        case 'search_experts': {
          const { skills } = action.args;
          const experts = await prisma.user.findMany({
            where: {
              role: 'EXPERT',
              isVerified: true,
              skills: { hasSome: skills },
            },
            select: {
              id: true,
              fullName: true,
              skills: true,
              experience: true,
              location: true,
              description: true,
            },
            take: 5,
          });
          results.push({ tool: action.tool, success: true, data: { experts } });
          break;
        }

        case 'search_opportunities': {
          const { skills } = action.args;
          const projects = await prisma.project.findMany({
            where: {
              status: 'matching',
              ...(skills && { techStack: { hasSome: skills } }),
            },
            select: {
              id: true,
              title: true,
              budget: true,
              timeline: true,
              techStack: true,
              description: true,
              createdAt: true,
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
          });
          results.push({ tool: action.tool, success: true, data: { projects } });
          break;
        }

        case 'submit_proposal': {
          const { projectId, proposedPrice, timeline, approach, methodology, experience } = action.args;
          
          // Vérifier si une proposition existe déjà
          const existing = await prisma.proposal.findFirst({
            where: { projectId, expertId: userId }
          });

          if (existing) {
            results.push({ tool: action.tool, success: false, error: 'Vous avez déjà soumis une proposition pour ce projet.' });
            break;
          }

          const proposal = await prisma.proposal.create({
            data: {
              projectId,
              expertId: userId,
              proposedPrice,
              timeline,
              approach,
              methodology,
              experience,
              status: 'pending'
            }
          });
          results.push({ tool: action.tool, success: true, data: { proposalId: proposal.id } });
          break;
        }

        case 'open_workspace':
        case 'navigate_to_page': {
          // Ces actions sont gérées côté frontend
          results.push({ tool: action.tool, success: true, data: action.args });
          break;
        }

        case 'get_project_messages': {
          const { projectId, limit } = action.args;
          const msgs = await prisma.message.findMany({
            where: { projectId },
            include: { sender: { select: { fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit || 10,
          });
          results.push({ tool: action.tool, success: true, data: { messages: msgs } });
          break;
        }

        case 'list_project_files': {
          const { projectId } = action.args;
          const files = await prisma.file.findMany({
            where: { projectId },
            select: { id: true, name: true, type: true, size: true, category: true, createdAt: true }
          });
          results.push({ tool: action.tool, success: true, data: { files } });
          break;
        }

        case 'read_project_file': {
          const { fileId } = action.args;
          const file = await prisma.file.findUnique({
            where: { id: fileId }
          });
          if (file) {
            // Ici on pourrait lire le contenu réel du fichier sur disque/cloud
            // Pour le moment, on retourne un contenu simulé pour les fichiers texte/pdf
            results.push({ 
              tool: action.tool, 
              success: true, 
              data: { 
                content: `Contenu du fichier "${file.name}": [Ceci est une simulation du contenu du document. L'IA peut maintenant analyser ce texte pour vous répondre.]` 
              } 
            });
          } else {
            results.push({ tool: action.tool, success: false, error: 'Fichier non trouvé' });
          }
          break;
        }

        default:
          results.push({ tool: action.tool, success: false, error: 'Action inconnue' });
      }
    } catch (err) {
      console.error(`Erreur exécution ${action.tool}:`, err);
      results.push({ tool: action.tool, success: false, error: err.message });
    }
  }

  return results;
};

const chatWithAI = async (req, res) => {
  try {
    const { messages, context, projectId, currentBrief } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Le format des messages est invalide.' });
    }

    // Déterminer le rôle réel de l'utilisateur pour toujours utiliser l'agent
    const userRole = req.user?.role;
    const effectiveContext = (context === 'workspace' || context === 'client') && userRole === 'CLIENT'
      ? 'client'
      : (context === 'workspace' || context === 'expert') && userRole === 'EXPERT'
      ? 'expert'
      : context;

    // Utiliser l'agent IA pour client et expert (y compris sur le workspace)
    if ((effectiveContext === 'client' || effectiveContext === 'expert') && req.user) {
      const userData = effectiveContext === 'client' 
        ? await getClientContext(req.user.id)
        : await getExpertContext(req.user.id);

      // Si on est dans un workspace, charger les messages du projet
      if (projectId) {
        const projectMessages = await prisma.message.findMany({
          where: { projectId },
          include: { sender: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
        userData.currentProjectId = projectId;
        userData.projectMessages = projectMessages.reverse().map(m => ({
          from: `${m.sender.fullName} (${m.sender.role})`,
          content: m.content,
          date: new Date(m.createdAt).toLocaleString('fr-FR'),
        }));
      }

      const aiResponse = await generateContextualResponse(messages, effectiveContext, userData);

      // Exécuter les actions côté serveur (envoi de messages, recherche)
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        const actionResults = await executeActions(aiResponse.actions, req.user.id);
        return res.json({
          message: aiResponse.message,
          actions: aiResponse.actions,
          actionResults,
        });
      }

      return res.json(aiResponse);
    }

    // Fallback : mode création de brief
    const aiResponse = await generateChatResponse(messages, context, currentBrief);
    res.json(aiResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la communication avec l\'IA.' });
  }
};

const handleVoiceChat = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier audio fourni.' });
    }

    const { messages, currentBrief: currentBriefStr } = req.body;
    let history = [];
    if (messages) {
      history = JSON.parse(messages);
    }
    let currentBrief = null;
    if (currentBriefStr) {
      currentBrief = JSON.parse(currentBriefStr);
    }

    const transcript = await transcribeAudio(req.file.path);
    fs.unlinkSync(req.file.path);

    const updatedHistory = [...history, { role: 'user', content: transcript }];
    const aiResponse = await generateChatResponse(updatedHistory, 'client', currentBrief);

    res.json({
      userTranscript: transcript,
      aiResponse: aiResponse
    });
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Erreur lors du traitement vocal.' });
  }
};

module.exports = { chatWithAI, handleVoiceChat };
