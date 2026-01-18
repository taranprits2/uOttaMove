const { findAccessibleWalkingRoute, loadAccessibleSegments } = require('./server/src/services/routing/walking_router');

console.log("Loading segments...");
const segments = loadAccessibleSegments();
console.log(`Loaded ${segments.length} segments.`);

// Test case 1: Known reachable points (hopefully)
// Coordinates from debug_segments.js
const start = [45.4241, -75.6579];
const end = [45.4270, -75.6549];

console.log(`Testing route from ${start} to ${end}...`);
const result = findAccessibleWalkingRoute(start, end);

if (result.success) {
    console.log("SUCCESS: Route found!");
    console.log(`Distance: ${result.distance_km}km`);
    console.log(`Segments: ${result.segments.length}`);
} else {
    console.log("FAILURE: No route found.");
    console.log(`Error: ${result.error}`);
}

// Test case 2: Random points that might be disconnected
// Try to find a route between two points that are somewhat far apart but should be connected
// Example: uOttawa campus logic
const start2 = [45.4215, -75.6820]; // Near widespread area
const end2 = [45.4240, -75.6850]; // Another spot

console.log(`\nTesting route 2 from ${start2} to ${end2}...`);
const result2 = findAccessibleWalkingRoute(start2, end2);

if (result2.success) {
    console.log("SUCCESS: Route 2 found!");
    console.log(`Distance: ${result2.distance_km}km`);
} else {
    console.log("FAILURE: No route 2 found.");
    console.log(`Error: ${result2.error}`);
}
