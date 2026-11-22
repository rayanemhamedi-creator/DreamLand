import api from './api';

const getTousLesRestaurants = async () => {
    const response = await api.get('/restaurants');
    return response.data;
};

const getRestaurantParId = async (id) => {
    const response = await api.get(`/restaurants/${id}`);
    return response.data;
};

const restaurantService = {
  getTousLesRestaurants,
  getRestaurantParId,
};

export default restaurantService;
