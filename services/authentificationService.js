import api from './api';

const connexion = async (email, motDePasse) => {
  const response = await api.post('/auth/login', { email, motDePasse });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  return response.data;
};

const inscription = async (userData) => {
  return await api.post('/auth/register', userData);
};

const deconnexion = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const getUtilisateurActuel = () => {
  return JSON.parse(localStorage.getItem('user'));
};

const authentificationService = {
  connexion,
  inscription,
  deconnexion,
  getUtilisateurActuel,
};

export default authentificationService;
