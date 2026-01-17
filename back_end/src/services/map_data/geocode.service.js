const axios = require('axios');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

exports.search = async (query) => {
    try {
        const response = await axios.get(NOMINATIM_URL, {
            params: {
                q: query,
                format: 'json',
                viewbox: '-76.35,45.15,-75.25,45.60', // Approximate fetch for Ottawa
                bounded: 1,
                limit: 5
            },
            headers: {
                'User-Agent': 'uOttaMove/1.0'
            }
        });

        return response.data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
        }));
    } catch (error) {
        console.error("Nominatim error:", error.message);
        throw error;
    }
};
