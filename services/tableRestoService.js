import api from './api';

// Fetch all tables for a restaurant/café by its ID
const getTablesParRestaurant = async (restaurantId) => {
  const response = await api.get(`/restaurants/${restaurantId}/tables`);
  return response.data;
};

const tableRestoService = {
  getTablesParRestaurant,
};

export default tableRestoService;
