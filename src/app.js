const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const briefRoutes = require('./routes/briefRoutes');
const projectRoutes = require('./routes/projectRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const messageRoutes = require('./routes/messageRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brief', briefRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/messages', messageRoutes);

// Route de base pour vérifier la santé de l'API
app.get('/', (req, res) => {
  res.json({ message: 'Nexcore API est en ligne !', version: '1.0.0' });
});

module.exports = app;
