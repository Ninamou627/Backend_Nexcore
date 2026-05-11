const { generateChatResponse, transcribeAudio } = require('../services/aiService');
const fs = require('fs');

const chatWithAI = async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Le format des messages est invalide.' });
    }

    const aiResponse = await generateChatResponse(messages, context);
    
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

    const { messages } = req.body;
    let history = [];
    if (messages) {
      history = JSON.parse(messages);
    }

    // 1. Transcrire l'audio avec Whisper
    const transcript = await transcribeAudio(req.file.path);
    
    // Supprimer le fichier temporaire
    fs.unlinkSync(req.file.path);

    // 2. Ajouter la transcription à l'historique
    const updatedHistory = [...history, { role: 'user', content: transcript }];

    // 3. Envoyer à l'IA Business Analyst (OpenRouter)
    const aiResponse = await generateChatResponse(updatedHistory);

    // 4. Retourner les deux pour le frontend
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
