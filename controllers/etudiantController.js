// Importer le modèle Etudiant
const Etudiant = require('../models/Etudiant');

// ============================================
// CRÉER UN ÉTUDIANT
// ============================================
exports.createEtudiant = async (req, res) => {
    try {
        console.log('📥 Données reçues:', req.body);

        // 🆕 ÉTAPE AJOUTÉE : Vérifier si l'étudiant existe déjà
        // On cherche un étudiant avec le même nom ET prénom
        const etudiantExistant = await Etudiant.findOne({
            nom: req.body.nom,
            prenom: req.body.prenom
        });

        // Si un étudiant est trouvé, on refuse la création
        if (etudiantExistant) {
            return res.status(400).json({
                success: false,
                message: `Un étudiant nommé ${req.body.prenom} ${req.body.nom} existe déjà`
            });
        }

        // Si pas de doublon, on crée l'étudiant normalement
        const etudiant = await Etudiant.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Étudiant créé avec succès',
            data: etudiant
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Cet email existe déjà'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Données invalides',
            error: error.message
        });
    }
};

// ============================================
// RÉCUPÉRER TOUS LES ÉTUDIANTS
// ============================================
// ============================================
// READ ALL - Récupérer tous les étudiants ACTIFS
// ============================================
exports.getAllEtudiants = async (req, res) => {
    try {
        // 🆕 Filtre ajouté : ne retourne que les étudiants actifs
        const etudiants = await Etudiant.find({ actif: true });

        res.status(200).json({
            success: true,
            count: etudiants.length,
            data: etudiants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};

// ============================================
// RÉCUPÉRER UN ÉTUDIANT PAR ID
// ============================================
exports.getEtudiantById = async (req, res) => {
    try {
        console.log('🔍 ID recherché:', req.params.id);

        const etudiant = await Etudiant.findById(req.params.id);

        if (!etudiant) {
            return res.status(404).json({
                success: false,
                message: 'Étudiant non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            data: etudiant
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};

// ============================================
// METTRE À JOUR UN ÉTUDIANT
// ============================================
exports.updateEtudiant = async (req, res) => {
    try {
        console.log('✏️ Mise à jour ID:', req.params.id);
        console.log('📥 Nouvelles données:', req.body);

        const etudiant = await Etudiant.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!etudiant) {
            return res.status(404).json({
                success: false,
                message: 'Étudiant non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Étudiant mis à jour avec succès',
            data: etudiant
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Erreur de mise à jour',
            error: error.message
        });
    }
};

// ============================================
// SUPPRIMER UN ÉTUDIANT
// ============================================
// ============================================
// DELETE - Désactiver un étudiant (Soft Delete)
// ============================================
exports.deleteEtudiant = async (req, res) => {
    try {
        console.log('🗑️ Désactivation de l\'ID:', req.params.id);

        // 🆕 Au lieu de supprimer, on met actif: false
        const etudiant = await Etudiant.findByIdAndUpdate(
            req.params.id,
            { actif: false },  // On désactive l'étudiant
            { new: true }       // Retourne le document modifié
        );

        if (!etudiant) {
            return res.status(404).json({
                success: false,
                message: 'Étudiant non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Étudiant désactivé avec succès',
            data: etudiant
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};

// ============================================
// RÉCUPÉRER PAR FILIÈRE
// ============================================
exports.getEtudiantsByFiliere = async (req, res) => {
    try {
        console.log('🔎 Filière:', req.params.filiere);

        const etudiants = await Etudiant.find({ filiere: req.params.filiere });

        res.status(200).json({
            success: true,
            count: etudiants.length,
            filiere: req.params.filiere,
            data: etudiants
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};
// ============================================
// SEARCH - Rechercher par nom ou prénom
// ============================================
// Route: GET /api/etudiants/search?q=texte
// Exemple: GET /api/etudiants/search?q=ahmed
exports.searchEtudiants = async (req, res) => {
    try {
        // Étape 1: Récupérer le paramètre de recherche depuis l'URL
        // req.query contient les paramètres après le "?"
        const searchTerm = req.query.q;
        
        console.log('🔎 Recherche du terme:', searchTerm);

        // Vérifier qu'un terme de recherche a été fourni
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'Veuillez fournir un terme de recherche (?q=...)'
            });
        }

        // Étape 2: Créer une expression régulière
        // 'i' = insensible à la casse (Ahmed = ahmed = AHMED)
        const regex = new RegExp(searchTerm, 'i');

        // Étape 3: Chercher dans le nom OU le prénom
        // $or signifie "au moins une des conditions doit être vraie"
        const etudiants = await Etudiant.find({
            $or: [
                { nom: regex },     // Si le nom correspond
                { prenom: regex }   // OU si le prénom correspond
            ]
        });

        // Étape 4: Retourner les résultats
        res.status(200).json({
            success: true,
            searchTerm: searchTerm,
            count: etudiants.length,
            data: etudiants
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};
// ============================================
// READ INACTIVE - Récupérer les étudiants désactivés
// ============================================
// Route: GET /api/etudiants/inactive
exports.getInactiveEtudiants = async (req, res) => {
    try {
        // Chercher les étudiants avec actif: false
        const etudiants = await Etudiant.find({ actif: false });

        res.status(200).json({
            success: true,
            count: etudiants.length,
            message: 'Liste des étudiants désactivés',
            data: etudiants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};