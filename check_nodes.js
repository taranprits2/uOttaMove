const { loadAccessibleSegments, buildGraph } = require('./server/src/services/routing/walking_router');
const { haversineDistance } = require('./server/src/utils/geo');

const segments = loadAccessibleSegments();
const graph = buildGraph(segments);
const nodePositions = graph.nodePositions;

const start = [45.4238, -75.6792];
const end = [45.4246, -75.6791];

console.log("Checking nodes near Start:");
let nearStart = [];
for (const [key, pos] of nodePositions.entries()) {
    const d = haversineDistance(start, pos);
    if (d < 100) nearStart.push({ key, pos, dist: d });
}
nearStart.sort((a, b) => a.dist - b.dist);
nearStart.slice(0, 5).forEach(n => console.log(`  Key: ${n.key} Dist: ${n.dist.toFixed(2)}m`));

console.log("\nChecking nodes near End:");
let nearEnd = [];
for (const [key, pos] of nodePositions.entries()) {
    const d = haversineDistance(end, pos);
    if (d < 100) nearEnd.push({ key, pos, dist: d });
}
nearEnd.sort((a, b) => a.dist - b.dist);
nearEnd.slice(0, 5).forEach(n => console.log(`  Key: ${n.key} Dist: ${n.dist.toFixed(2)}m`));
