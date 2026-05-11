const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const openRouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title': 'Nexcore B2B',
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
Tu es l'Expert Business Analyst de Nexcore. Ton objectif est de transformer les idées floues d'un client en un cahier des charges technique et fonctionnel EXTRÊMEMENT DÉTAILLÉ.

Ton processus :
1. Pose des questions ciblées, une par une, pour extraire : les objectifs métier, les fonctionnalités clés, les utilisateurs cibles, le budget et le délai.
2. N'hésite pas à suggérer des fonctionnalités intelligentes auxquelles le client n'aurait pas pensé.

RÈGLE D'OR POUR LE RÉSULTAT FINAL :
Dès que tu as assez d'éléments, tu dois générer un JSON final. La section "description" doit être un véritable Cahier des Charges (CDC) structuré avec :
- Contexte et Objectifs
- Liste détaillée des fonctionnalités (Front-end & Back-end)
- Spécifications techniques (si mentionnées)
- Contraintes éventuelles

Format JSON attendu :
{
  "isComplete": true,
  "brief": {
    "title": "Titre professionnel du projet",
    "description": "REMPLIR ICI AVEC LE CAHIER DES CHARGES DÉTAILLÉ (plusieurs paragraphes structurés)",
    "budget": "Budget estimé",
    "timeline": "Délai estimé",
    "techStack": ["Techno1", "Techno2"]
  }
}
`;

const EXPERT_SYSTEM_PROMPT = `
Tu es l'Expert Stratégique de Nexcore pour les prestataires. Ton objectif est d'aider les experts (agences, freelances) à remporter des projets et à exceller dans leur travail.

Tes missions :
1. Aide à la rédaction de propositions : Aide l'expert à structurer son approche technique, sa méthodologie et ses arguments de vente en fonction du projet.
2. Analyse de brief : Aide l'expert à comprendre les points critiques d'un cahier des charges client.
3. Conseil technique : Réponds à des questions techniques sur le stack ou l'architecture pour aider l'expert à faire les meilleurs choix.

Sois professionnel, précis et encourageant.
`;

const generateChatResponse = async (messages, context = 'client') => {
  try {
    const systemPrompt = context === 'expert' ? EXPERT_SYSTEM_PROMPT : SYSTEM_PROMPT;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await openRouterClient.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: formattedMessages,
      temperature: 0.7,
    });

    const aiMessage = response.choices[0].message.content;

    try {
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.isComplete && parsed.brief) {
          return { isComplete: true, data: parsed.brief };
        }
      }
    } catch (e) {
    }

    return { isComplete: false, message: aiMessage };
  } catch (error) {
    console.error('Erreur IA:', error);
    throw new Error('Impossible de générer une réponse.');
  }
};

const transcribeAudio = async (filePath) => {
  try {
    // Utilisation du modèle Gemini 2.5 Flash pour une transcription ultra-rapide.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const audioBytes = fs.readFileSync(filePath);

    // Le front-end envoie du webm (MediaRecorder par défaut sur Chrome)
    const mimeType = "audio/webm";

    const prompt = "Transcris cet enregistrement vocal en texte brut, de manière fidèle, sans rien ajouter d'autre. Si l'audio est vide ou incompréhensible, réponds juste '(incompréhensible)'.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBytes.toString("base64"),
          mimeType
        }
      }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Erreur Gemini Audio:', error);
    throw new Error('Impossible de transcrire le fichier audio avec Gemini.');
  }
};

const analyzeProposals = async (project, proposals) => {
  try {
    const prompt = `
En tant qu'expert en recrutement IT et Business Analyst, analyse les propositions suivantes pour le projet "${project.title}".

DESCRIPTION DU PROJET :
${project.description}
Budget cible : ${project.budget}
Stack technique souhaité : ${project.techStack.join(', ')}

LISTE DES PROPOSITIONS :
${proposals.map((p, index) => `
EXPERT ${index + 1} : ${p.expert.fullName} (ID: ${p.id})
Prix proposé : ${p.proposedPrice}
Délai : ${p.timeline}
Approche : ${p.approach}
Méthodologie : ${p.methodology}
Expérience : ${p.experience}
`).join('\n---\n')}

TON OBJECTIF :
Sélectionne le MEILLEUR candidat et explique pourquoi. Sois critique mais juste. 
Compare l'adéquation technique, le rapport qualité/prix et le sérieux de la méthodologie.

FORMAT JSON ATTENDU :
{
  "recommendation": {
    "proposalId": "ID_DE_LA_PROPOSITION_CHOISIE",
    "expertName": "NOM_DE_L_EXPERT",
    "reasoning": "Explication détaillée de ton choix en 3-4 phrases.",
    "matchingScore": 95,
    "pros": ["Point fort 1", "Point fort 2"],
    "cons": ["Point de vigilance ou faiblesse mineure"]
  }
}
`;

    const response = await openRouterClient.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: "Tu es un expert en évaluation de propositions techniques B2B. Tu réponds exclusivement en JSON." },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Erreur Analyse IA:', error);
    throw new Error('Impossible d\'analyser les propositions.');
  }
};

const generateMilestones = async (project, proposal) => {
  try {
    const response = await openRouterClient.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en gestion de projet. Découpe ce projet en 4 à 6 jalons (milestones) logiques.
          Le budget total à répartir est strictement celui proposé par l'expert : ${proposal.proposedPrice}.
          Chaque jalon doit avoir:
          - title: Un titre court et percutant
          - description: Ce qui sera fait
          - amount: Une portion du budget total (nombre sans devise, ex: 1500.50). La somme des jalon doit être égale à ${proposal.proposedPrice}.
          - deliverables: Une liste (Array) des livrables concrets
          - duration: Durée estimée en jours
          
          Réponds uniquement en JSON.`
        },
        {
          role: 'user',
          content: `Projet: ${project.title}. Description: ${project.description}. 
          Méthodologie de l'expert: ${proposal.methodology}. 
          Prix total négocié: ${proposal.proposedPrice}`
        }
      ],
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(response.choices[0].message.content);
    return data.milestones || data;
  } catch (error) {
    console.error('AI Milestone Generation Error:', error);
    throw error;
  }
};

module.exports = { 
  generateChatResponse, 
  transcribeAudio, 
  analyzeProposals,
  generateMilestones 
};
