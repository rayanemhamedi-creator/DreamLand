import api from './api';

const getTousLesGuides = async () => {
    const response = await api.get('/guides');
    return response.data;
};

const guideService = {
    getTousLesGuides,
};

export default guideService;
