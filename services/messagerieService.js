import axios from 'axios';

const API_URL = 'http://localhost:8080/api/messages';

const messagerieService = {
    envoyerMessage: async (receiverId, content) => {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/envoyer`, 
            { receiverId, content },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    getConversation: async (interlocuteurId) => {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/conversation/${interlocuteurId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    getInterlocuteurs: async () => {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/interlocuteurs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    getNombreNonLus: async () => {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/nombre-non-lus`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    marquerCommeLu: async (senderId) => {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/marquer-lu/${senderId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    getAdministrateur: async () => {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/utilisateur-admin`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },
    supprimerMessage: async (messageId) => {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/${messageId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },
    supprimerConversation: async (interlocuteurId) => {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/conversation/${interlocuteurId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};

export default messagerieService;
