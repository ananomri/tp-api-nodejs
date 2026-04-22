// ============================================
// IMPORTS
// ============================================
const express = require('express');
const router = express.Router();

const {
  getAllEtudiants,
  getEtudiantById,
  createEtudiant,
  updateEtudiant,
  deleteEtudiant,
  getEtudiantsByFiliere,
  searchEtudiants,
  getInactiveEtudiants
} = require('../controllers/etudiantController');

// ============================================
// DÉFINITION DES ROUTES
// ============================================

// GET  /api/etudiants       → liste tous les étudiants
// POST /api/etudiants       → crée un nouvel étudiant
router.route('/')
  .get(getAllEtudiants)
  .post(createEtudiant);

// ⚠️ IMPORTANT: routes spécifiques AVANT /:id
// sinon Express interprète "search" comme un ID

// GET /api/etudiants/search?q=...  → recherche
router.get('/search', searchEtudiants);

// GET /api/etudiants/filiere/:filiere  → par filière
router.get('/filiere/:filiere', getEtudiantsByFiliere);

// GET /api/etudiants/inactive  → étudiants inactifs
router.get('/inactive', getInactiveEtudiants);

// GET    /api/etudiants/:id  → un étudiant par ID
// PUT    /api/etudiants/:id  → modifier
// DELETE /api/etudiants/:id  → supprimer
router.route('/:id')
  .get(getEtudiantById)
  .put(updateEtudiant)
  .delete(deleteEtudiant);

module.exports = router;