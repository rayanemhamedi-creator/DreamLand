import axios from 'axios';

// URL de base de notre API backend
const API_URL = 'http://localhost:8080/api';

// Création d'une instance Axios dédiée avec l'URL de base préconfigurée
const api = axios.create({
  baseURL: API_URL,
});

// Helper pour aplatir/reconstruire dynamiquement les objets `utilisateur` pour compenser le nouvel héritage JPA
const processUtilisateur = (obj, direction) => {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(item => processUtilisateur(item, direction));
    return;
  }

  if (obj.utilisateur && typeof obj.utilisateur === 'object') {
    if (direction === 'flatten') {
      obj.nom = obj.utilisateur.nom;
      obj.prenom = obj.utilisateur.prenom;

      // Ne pas écraser l'adresse/localisation si elles existent déjà
      if (!obj.adresse) obj.adresse = obj.utilisateur.adresse;
      if (!obj.localisation) obj.localisation = obj.utilisateur.localisation;
      if (!obj.telephone) obj.telephone = obj.utilisateur.telephone;
    } else if (direction === 'unflatten') {
      if (obj.nom !== undefined) obj.utilisateur.nom = obj.nom;
      if (obj.prenom !== undefined) obj.utilisateur.prenom = obj.prenom;
      if (obj.adresse !== undefined) obj.utilisateur.adresse = obj.adresse;
      if (obj.telephone !== undefined) obj.utilisateur.telephone = obj.telephone;
    }
  }

  // Boucle récursive sécurisée à l'intérieur de la fonction
  Object.values(obj).forEach(val => {
    if (val && typeof val === 'object' && !(val instanceof FormData)) {
      processUtilisateur(val, direction);
    }
  });
};

// Intercepteur de requêtes : s'exécute avant que chaque requête ne soit envoyée au serveur
api.interceptors.request.use(
  (config) => {
    // Si on a des données JSON en envoi, on fait correspondre les champs racines vers l'objet utilisateur
    if (config.data && !(config.data instanceof FormData)) {
      try {
        // Créer une copie pour ne pas muter l'état React accidentellement
        config.data = JSON.parse(JSON.stringify(config.data));
        
        // DEBUG: On vérifie si la localisation est présente avant transformation
        if (config.data.localisation) {
            console.log("📍 Localisation détectée avant envoi:", config.data.localisation);
        }
        
        processUtilisateur(config.data, 'unflatten');
        
        // Sécurité : S'assurer que la localisation reste aussi à la racine pour l'entité Hotel
        if (config.data.utilisateur?.localisation && !config.data.localisation) {
            config.data.localisation = config.data.utilisateur.localisation;
        }
      } catch (e) { console.error('Erreur interception requete:', e); }
    }

    // Récupération du jeton (token) d'authentification depuis le stockage local (localStorage)
    const token = localStorage.getItem('token');

    // Si un jeton existe, on l'ajoute dans l'en-tête "Authorization" pour authentifier la requête auprès de notre API
    if (token) {
      console.log("Envoi du token:", token.substring(0, 20) + "...");
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    // Retourne la configuration mise à jour pour que la requête puisse partir
    return config;
  },
  // Gestion d'éventuelles erreurs lors de la mise en place de la configuration de la requête
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponses : s'exécute quand une réponse est reçue du serveur ou quand une erreur HTTP survient
api.interceptors.response.use(
  // Si la réponse est un succès (statut 2xx), on la laisse passer telle quelle vers le front-end
  (response) => {
    // Aplatie la réponse pour que le Frontend trouve 'nom', 'adresse', etc à la racine
    if (response.data) {
      processUtilisateur(response.data, 'flatten');
    }
    return response;
  },
  // Gestion des erreurs provenant de la réponse du serveur
  (error) => {
    // Si l'erreur est liée à une non-autorisation (statut HTTP 401), c'est que le token est expiré, manquant, ou invalide
    if (error.response && error.response.status === 401) {
      // Suppression des données sécurisées utilisateur et de session stockées en local
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirection automatique de l'utilisateur vers la page de connexion pour renouveler sa session
      window.location.href = '/login';
    }
    // On propage l'erreur via promise pour pouvoir la gérer aussi au niveau du composant ou de la page appelante
    return Promise.reject(error);
  }
);

export default api;
