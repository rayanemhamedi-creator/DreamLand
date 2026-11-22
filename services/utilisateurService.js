import api from './api';

const mettreAJourUtilisateur = async (id, userData) => {
    const response = await api.put(`/utilisateurs/${id}`, userData);
    return response.data;
};

const utilisateurService = {
    mettreAJourUtilisateur,
    changerMotDePasse: async (oldPassword, newPassword) => {
        const response = await api.put('/utilisateurs/modifier-mot-de-passe', { oldPassword, newPassword });
        return response.data;
    }
};

export default utilisateurService;
