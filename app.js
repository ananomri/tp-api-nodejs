// app.js — Express app definition (no listen() here)
const express = require('express');
const path = require('path');
const etudiantRoutes = require('./routes/etudiantRoutes');

const app = express();

// ============================================
// MIDDLEWARES
// ============================================
app.use(express.json());

// Servir les fichiers statiques du frontend (public/)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// ROUTES API
// ============================================

// API meta endpoint (utile pour debug et health)
app.get('/api', (req, res) => {
  res.json({
    name: 'API Gestion Étudiants',
    version: '1.0.0',
    endpoints: {
      list:       'GET    /api/etudiants',
      create:     'POST   /api/etudiants',
      get:        'GET    /api/etudiants/:id',
      update:     'PUT    /api/etudiants/:id',
      archive:    'DELETE /api/etudiants/:id',
      inactive:   'GET    /api/etudiants/inactive',
      search:     'GET    /api/etudiants/search?q=',
      byFiliere:  'GET    /api/etudiants/filiere/:filiere',
    },
  });
});

// Health endpoint (utilisé par le smoke test CI et par AWS)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes étudiants
app.use('/api/etudiants', etudiantRoutes);

// ============================================
// 404 handler — JSON pour /api, sinon laisse passer
// (les routes statiques ont déjà servi index.html si besoin)
// ============================================
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`,
  });
});

// Fallback : pour toute route non-API, renvoyer index.html (SPA-friendly)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
