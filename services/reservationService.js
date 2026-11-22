import api from './api';

const reserverHotel = async (data) => {
  return await api.post('/reservations/hotel', data);
};

const apercuHotel = async (data) => {
  return await api.post('/reservations/hotel/preview', data);
};

const reserverRestaurant = async (data) => {
  return await api.post('/reservations/restaurant', data);
};

const getTablesDisponibles = async (restaurantId, dateHeure) => {
  return await api.get(`/restaurants/${restaurantId}/tables-disponibles?dateHeure=${dateHeure}`);
};

const getMesReservationsRestaurant = async () => {
    return await api.get('/reservations/mon-restaurant');
};

const getMesReservationsSport = async () => {
    return await api.get('/reservations/mon-sport');
};

const apercuSport = async (data) => {
    return await api.post('/reservations/sport/preview', data);
};

const reserverSport = async (data) => {
    return await api.post('/reservations/sport', data);
};

const reserverCinema = async (data) => {
  return await api.post('/reservations/cinema', data);
};

const reserverSortie = async (data) => {
  return await api.post('/reservations/sortie', data);
};

const reserverEvenement = async (data) => {
  return await api.post('/reservations/evenement', data);
};

const getMesReservations = async () => {
    const response = await api.get('/reservations/mes-reservations');
    return response.data;
};

const annulerReservation = async (id) => {
    const response = await api.post(`/reservations/${id}/annuler`);
    return response.data;
};

const getToutesLesReservations = async () => {
    const response = await api.get('/reservations');
    return response.data;
};

const getReservationsAnnulees = async () => {
    const response = await api.get('/reservations/annulees');
    return response.data;
};

const getReservationParId = async (id) => {
    const response = await api.get(`/reservations/${id}`);
    return response.data;
};

const getReservationParSession = async (sessionId) => {
    const response = await api.get(`/payments/session/${sessionId}`);
    return response.data;
};

const reservationService = {
  reserverHotel,
  apercuHotel,
  reserverRestaurant,
  getTablesDisponibles,
  getMesReservationsRestaurant,
  getMesReservationsSport,
  apercuSport,
  reserverSport,
  reserverCinema,
  reserverSortie,
  reserverEvenement,
  getToutesLesReservations,
  getMesReservations,
  getReservationsAnnulees,
  annulerReservation,
  getReservationParSession,
  getReservationParId
};

export default reservationService;
