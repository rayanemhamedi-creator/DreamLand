import api from './api';

const getTousLesHotels = async () => {
  const response = await api.get('/hotels');
  return response.data;
};

const getHotelParId = async (id) => {
  const response = await api.get(`/hotels/${id}`);
  return response.data;
};

const searchHotels = async (params) => {
  const response = await api.get('/hotels/search', { params });
  return response.data;
};

const creerHotel = async (hotelData) => {
  return await api.post('/hotels', hotelData);
};

const getFormulesHotel = async (hotelId) => {
    const response = await api.get(`/hotels/${hotelId}/formules`);
    return response.data;
};

const hotelService = {
  getTousLesHotels,
  getHotelParId,
  creerHotel,
  getFormulesHotel,
  searchHotels
};

export default hotelService;
