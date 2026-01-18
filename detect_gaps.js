const { loadAccessibleSegments, buildGraph } = require('./server/src/services/routing/walking_router');
const { haversineDistance } = require('./server/src/utils/geo');

const segments = loadAccessibleSegments();
const graph = buildGraph(segments);
const nodePositions = Array.from(graph.nodePositions.entries());

console.log(`Checking gaps between ${nodePositions.length} nodes... this might take a while.`);

let gapsFound = 0;
const MAX_GAPS = 20;

// O(N^2) is too slow, let's use a grid or just sample.
for (let i = 0; i < 5000; i++) { // Sample 5000 nodes
    const idx1 = Math.floor(Math.random() * nodePositions.length);
    const [key1, pos1] = nodePositions[idx1];

    for (let j = 0; j < 5000; j++) {
        const idx2 = Math.floor(Math.random() * nodePositions.length);
        const [key2, pos2] = nodePositions[idx2];

        if (key1 === key2) continue;

        const d = haversineDistance(pos1, pos2);
        if (d > 0 && d < 1.0) { // Closer than 1m but different keys
            // Are they in the same component?
            // Actually, any gap < 1m is suspicious if they are not connected.
            gapsFound++;
            if (gapsFound <= MAX_GAPS) {
                console.log(`Gap: ${d.toFixed(3)}m between ${key1} and ${key2}`);
            }
        }
    }
}

console.log(`Finished sampling. Gaps found: ${gapsFound}`);
