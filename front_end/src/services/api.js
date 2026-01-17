import axios from 'axios';

const API_Base = 'http://localhost:3000/api';

export const searchPlace = async (query) => {
    const response = await axios.get(`${API_Base}/map/search`, { params: { query } });
    return response.data;
};

export const getWalkingRoute = async (start, end, profile) => {
    const response = await axios.post(`${API_Base}/routes/walking`, { start, end, profile });
    return response.data;
};
