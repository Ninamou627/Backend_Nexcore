const http = require('http');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Charger les variables d'environnement en premier
dotenv.config();

// Importer l'application Express
const app = require('./src/app');

// Créer le serveur HTTP natif
const server = http.createServer(app);

// Configurer Socket.IO pour le temps réel (Messagerie)
const io = new Server(server, {
  cors: {
    origin: '*', // En production, on mettra l'URL exacte du frontend
    methods: ['GET', 'POST']
  }
});

// Écoute des événements WebSocket
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Un utilisateur est connecté : ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Utilisateur déconnecté : ${socket.id}`);
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Serveur réseau démarré sur le port ${PORT}`);
});
