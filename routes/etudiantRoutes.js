// Importer Express et créer un routeur
const express = require('express');
const router = express.Router();

// Importer toutes les fonctions du contrôleur
const {
    getAllEtudiants,
    getEtudiantById,
    createEtudiant,
    updateEtudiant,
    deleteEtudiant,
    getEtudiantsByFiliere,
    searchEtudiants , // 🆕 AJOUTÉ
    getInactiveEtudiants  // 🆕 AJOUTÉ
} = require('../controllers/etudiantController');

// ============================================
// DÉFINITION DES ROUTES
// ============================================

// Route:  /api/etudiants
// GET  → Liste tous les étudiants
// POST → Crée un nouvel étudiant
router.route('/')
    .get(getAllEtudiants)
    .post(createEtudiant);
router.get('/search', searchEtudiants);
// ⚠️ IMPORTANT:  Cette route DOIT être avant /: id
// Sinon "filiere" serait interprété comme un ID
router.get('/filiere/:filiere', getEtudiantsByFiliere);
router.get('/inactive', getInactiveEtudiants);
// Route: /api/etudiants/:id
// GET    → Récupère un étudiant par ID
// PUT    → Modifie un étudiant
// DELETE → Supprime un étudiant
router.route('/:id')
    .get(getEtudiantById)
    .put(updateEtudiant)
    .delete(deleteEtudiant);
router.get('/search', searchEtudiants);
// Exporter le routeur
module.exports = router;