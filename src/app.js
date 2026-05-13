const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { xss } = require('express-xss-sanitizer');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middlewares
app.use(morgan('dev'));
app.use(helmet({
  crossOriginResourcePolicy: false, // Nécessaire pour afficher les images du dossier /uploads sur le frontend
}));
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(xss()); // A03: Sanitize user input to prevent XSS attacks
app.use('/uploads', express.static('uploads'));

const briefRoutes = require('./routes/briefRoutes');
const projectRoutes = require('./routes/projectRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fileRoutes = require('./routes/fileRoutes');
const auditRoutes = require('./routes/auditRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brief', briefRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/audits', auditRoutes);

// Route de base pour vérifier la santé de l'API
app.get('/', (req, res) => {
  res.json({ message: 'Nexcore API est en ligne !', version: '1.0.0' });
});

// A05: Gestion globale des erreurs (Évite les fuites de stack trace)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Une erreur interne est survenue',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

module.exports = app;
