const axios = require('axios');

// Default to a local Unweaver instance. 
// Standard Unweaver port is often 8000, or exposed via AccessMap API on another port.
const ACCESSMAP_API_URL = process.env.ACCESSMAP_API_URL || 'http://localhost:8000';

/**
 * Fetch walking route from AccessMap (Unweaver) API
 * @param {Object} start - { lat, lon }
 * @param {Object} end - { lat, lon }
 * @param {String} profile - Routing profile (e.g., 'wheelchair', 'powered', 'cane')
 * @returns {Object} GeoJSON FeatureCollection of the route
 */
exports.getWalkingRoute = async (start, end, profile = 'wheelchair') => {
    try {
        // Unweaver API structure: /shortest_path/<profile>.json
        const url = `${ACCESSMAP_API_URL}/shortest_path/${profile}.json`;

        console.log(`Requesting route from AccessMap at: ${url}`);

        // Unweaver typically expects 'origin' and 'destination' as "lon,lat" strings
        const params = {
            origin: `${start.lon},${start.lat}`,
            destination: `${end.lon},${end.lat}`
        };

        const response = await axios.get(url, {
            params: params,
            timeout: 5000 // 5 seconds timeout
        });

        if (response.data) {
            return response.data;
        } else {
            throw new Error('No data received from AccessMap API');
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`AccessMap Connection Timeout: Could not connect to ${ACCESSMAP_API_URL} within 5s.`);
            console.error("Make sure your local AccessMap/Unweaver service is running and ACCESSMAP_API_URL is correct.");
        } else if (error.response) {
            console.error("AccessMap API Error:", error.response.status, error.response.data);
        } else {
            console.error("Routing Service Error:", error.message);
        }
        throw new Error("Failed to fetch route from AccessMap");
    }
};
