// ============================================
// server.js — Démarrage du serveur
// ============================================
const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/database');

// Charger les variables d'environnement
dotenv.config();

// Connexion DB puis démarrage
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🎓  Académie · API + Frontend démarrés    ║
╠════════════════════════════════════════════╣
║   📍 URL    : http://localhost:${String(PORT).padEnd(11)}║
║   📚 API    : http://localhost:${PORT}/api       ║
║   ❤️  Health : http://localhost:${PORT}/health    ║
╚════════════════════════════════════════════╝
    `);
  });
}).catch((err) => {
  console.error('❌ Échec du démarrage :', err.message);
  process.exit(1);
});
