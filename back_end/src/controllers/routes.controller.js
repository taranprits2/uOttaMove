const geocodeService = require('../services/map_data/geocode.service');
const accessmapService = require('../services/routing/accessmap.service');

exports.searchLocation = async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }
    try {
        const results = await geocodeService.search(query);
        res.json(results);
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: 'Failed to search location' });
    }
};

exports.getWalkingRoute = async (req, res) => {
    const { start, end, profile } = req.body;

    if (!start || !end || !start.lat || !start.lon || !end.lat || !end.lon) {
        return res.status(400).json({ error: 'Invalid start or end coordinates' });
    }

    try {
        // Use AccessMap Service
        const route = await accessmapService.getWalkingRoute(start, end, profile);

        if (!route) {
            return res.status(404).json({ error: 'No route found' });
        }

        res.json(route);
    } catch (error) {
        console.error("Routing error:", error);
        res.status(500).json({ error: 'Failed to calculate route' });
    }
};
