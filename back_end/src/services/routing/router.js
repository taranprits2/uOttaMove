const turf = require('@turf/turf');

// Simple Priority Queue Helper
class PriorityQueue {
    constructor() {
        this.items = [];
    }
    enqueue(element, priority) {
        const queueElement = { element, priority };
        let added = false;
        for (let i = 0; i < this.items.length; i++) {
            if (queueElement.priority < this.items[i].priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }
        if (!added) this.items.push(queueElement);
    }
    dequeue() {
        return this.items.shift();
    }
    isEmpty() {
        return this.items.length === 0;
    }
}

function findNearestNode(graph, lat, lon) {
    let nearest = null;
    let minDist = Infinity;

    // This is slow (O(N)), but okay for small fetched subgraphs
    for (const id in graph) {
        const node = graph[id];
        const dist = turf.distance(
            turf.point([lon, lat]),
            turf.point([node.lon, node.lat]),
            { units: 'meters' }
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = id;
        }
    }
    return nearest;
}

exports.calculateRoute = (graph, startCoords, endCoords, profile) => {
    // 1. Find start and end nodes in the graph
    console.log(`Calculating route from [${startCoords.lat}, ${startCoords.lon}] to [${endCoords.lat}, ${endCoords.lon}]`);
    const startNodeId = findNearestNode(graph, startCoords.lat, startCoords.lon);
    const endNodeId = findNearestNode(graph, endCoords.lat, endCoords.lon);

    console.log(`Matched Start Node: ${startNodeId}, End Node: ${endNodeId}`);

    if (!startNodeId || !endNodeId) {
        console.error("Could not find nearest nodes in graph.");
        return null;
    }

    // 2. A* Algorithm
    const openSet = new PriorityQueue();
    openSet.enqueue(startNodeId, 0);

    const cameFrom = {}; // Map to reconstruct path
    const gScore = {}; // Cost from start
    const fScore = {}; // Estimated total cost

    // Initialize scores
    for (const id in graph) {
        gScore[id] = Infinity;
        fScore[id] = Infinity;
    }

    gScore[startNodeId] = 0;
    fScore[startNodeId] = heuristic(graph[startNodeId], graph[endNodeId]);

    while (!openSet.isEmpty()) {
        const { element: current } = openSet.dequeue();

        if (current === endNodeId) {
            return reconstructPath(cameFrom, current, graph);
        }

        const currentNode = graph[current];

        for (const neighbor of currentNode.neighbors) {
            const neighborId = neighbor.node;
            const tentativeGScore = gScore[current] + neighbor.cost;

            if (tentativeGScore < gScore[neighborId]) {
                cameFrom[neighborId] = current;
                gScore[neighborId] = tentativeGScore;
                fScore[neighborId] = gScore[neighborId] + heuristic(graph[neighborId], graph[endNodeId]);

                // Note: In optimal PQ, we'd update priority. Here we just re-add (lazily).
                openSet.enqueue(neighborId, fScore[neighborId]);
            }
        }
    }

    return null; // No path found
};

function heuristic(nodeA, nodeB) {
    // Euclidean distance as heuristic (in meters)
    // Multiplied by 1.0 (admissible if weights are >= dist). 
    // Since weights can be > dist (penalties), this is valid.
    return turf.distance(
        turf.point([nodeA.lon, nodeA.lat]),
        turf.point([nodeB.lon, nodeB.lat]),
        { units: 'meters' }
    );
}

function reconstructPath(cameFrom, current, graph) {
    const totalPath = [current];
    while (current in cameFrom) {
        current = cameFrom[current];
        totalPath.unshift(current);
    }

    // Convert to GeoJSON
    const coordinates = totalPath.map(id => [graph[id].lon, graph[id].lat]);

    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {
                distance: 0, // TODO: sum distance
            },
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            }
        }]
    };
}
