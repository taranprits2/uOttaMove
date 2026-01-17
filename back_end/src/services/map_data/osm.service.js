const axios = require('axios');
const scoringService = require('../accessibility/sidewalkScoring');
const turf = require('@turf/turf');

// Helper to convert OSM elements to a Graph
// Graph format: { nodes: { id: { lat, lon, neighbors: [{ id, cost, distance, tags }] } } }

exports.fetchGraphForArea = async (start, end) => {
    // 1. Calculate BBox
    const margin = 0.005; // approx 500m buffer
    const minLat = Math.min(start.lat, end.lat) - margin;
    const maxLat = Math.max(start.lat, end.lat) + margin;
    const minLon = Math.min(start.lon, end.lon) - margin;
    const maxLon = Math.max(start.lon, end.lon) + margin;

    const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

    // 2. Fetch from OSM Overpass or API
    // Using main API for map data (might be heavy if area is large, but okay for prototype)
    // Querying: way[highway][footway|pedestrian|residential|service|path] ...
    // Better to use Overpass JSON.

    const overpassQuery = `
        [out:json];
        (
          way["highway"~"footway|pedestrian|path|steps|cycleway|residential|service|tertiary|secondary|primary"](${minLat},${minLon},${maxLat},${maxLon});
        );
        (._;>;);
        out body;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    console.log(`Fetching OSM data for bbox: ${bbox}`);

    try {
        const response = await axios.get(url, { timeout: 30000 }); // Increased to 30s
        const data = response.data;
        console.log(`Fetched ${data.elements ? data.elements.length : 0} elements from OSM.`);

        const graph = buildGraph(data.elements);
        console.log(`Built graph with ${Object.keys(graph).length} nodes.`);
        return graph;
    } catch (error) {
        console.error("OSM Fetch error:", error.message);
        throw new Error("Failed to fetch map data");
    }
};

function buildGraph(elements) {
    const nodes = {};
    const ways = [];

    // First pass: Index nodes
    elements.forEach(el => {
        if (el.type === 'node') {
            nodes[el.id] = { id: el.id, lat: el.lat, lon: el.lon, neighbors: [] };
        } else if (el.type === 'way') {
            ways.push(el);
        }
    });

    // Second pass: Build edges from ways
    ways.forEach(way => {
        const costMultiplier = scoringService.getSegmentCost(way.tags || {});

        if (costMultiplier === Infinity) return; // Skip non-accessible ways

        for (let i = 0; i < way.nodes.length - 1; i++) {
            const uId = way.nodes[i];
            const vId = way.nodes[i + 1];

            if (nodes[uId] && nodes[vId]) {
                const u = nodes[uId];
                const v = nodes[vId];

                const dist = turf.distance(
                    turf.point([u.lon, u.lat]),
                    turf.point([v.lon, v.lat]),
                    { units: 'meters' }
                );

                const finalCost = dist * costMultiplier;

                // Add edges (undirected for now, unless oneway)
                // OSM ways are separate segments, usually bidirectional for walking unless specified.
                // assuming bidirectional for walking paths

                nodes[uId].neighbors.push({ node: vId, cost: finalCost, distance: dist, lat: v.lat, lon: v.lon });
                nodes[vId].neighbors.push({ node: uId, cost: finalCost, distance: dist, lat: u.lat, lon: u.lon });
            }
        }
    });

    return nodes;
}
