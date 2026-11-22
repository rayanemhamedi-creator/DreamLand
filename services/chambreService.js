import api from './api';

const getChambresParHotel = async (hotelId) => {
  const response = await api.get(`/chambres/hotel/${hotelId}`);
  return response.data;
};

const chambreService = {
  getChambresParHotel,
};

export default chambreService;
