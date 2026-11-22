import axios from 'axios';
import CONFIG from '../../config';

const api = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: 3000, // 3 seconds timeout so that unreachable APIs fail quickly and fall back to local mock data gracefully
});

// Helper to flatten nested user objects to match JPA inheritance conventions
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

      // Do not overwrite existing root fields
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

  Object.values(obj).forEach(val => {
    if (val && typeof val === 'object') {
      processUtilisateur(val, direction);
    }
  });
};

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    if (config.data) {
      try {
        config.data = JSON.parse(JSON.stringify(config.data));
        processUtilisateur(config.data, 'unflatten');
        
        if (config.data.utilisateur?.localisation && !config.data.localisation) {
          config.data.localisation = config.data.utilisateur.localisation;
        }
      } catch (e) {
        console.error('Error request interceptor:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      processUtilisateur(response.data, 'flatten');
    }
    return response;
  },
  (error) => {
    // Return structured errors
    return Promise.reject(error);
  }
);

export default api;
