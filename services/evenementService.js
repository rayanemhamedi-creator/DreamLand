import api from './api';

const getTousLesEvenements = async () => {
    const response = await api.get('/evenements');
    return response.data;
};

const getTousLesFilms = async () => {
    const response = await api.get('/films');
    return response.data;
};

const getTousLesCinemas = async () => {
    const response = await api.get('/cinemas');
    return response.data;
};

const searchCinemas = async (params) => {
    const response = await api.get('/cinemas/search', { params });
    return response.data;
};


const getTousLesSorties = async () => {
    const response = await api.get('/sorties');
    return response.data;
};

const getTousLesSports = async () => {
    const response = await api.get('/sports');
    return response.data;
};

const evenementService = {
  getTousLesEvenements,
  getTousLesCinemas,
  searchCinemas,
  getTousLesFilms,
  getTousLesSorties,
  getTousLesSports,
};

export default evenementService;
