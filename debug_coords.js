const { findAccessibleWalkingRoute } = require('./server/src/services/routing/walking_router');

const cases = [
    { start: [45.4207, -75.6949], end: [45.4207, -75.6938], name: "Short Route" },
    { start: [45.4207, -75.6949], end: [45.4192, -75.7019], name: "Failed Long Route" }
];

cases.forEach(c => {
    console.log(`\nTesting ${c.name}:`);
    const result = findAccessibleWalkingRoute(c.start, c.end);
    if (result.success) {
        console.log(`  SUCCESS! Dist: ${result.distance_km.toFixed(2)}km, Acc: ${result.accessibility_percent}%`);
    } else {
        console.log(`  FAILED: ${result.error}`);
        if (result.diagnostics) console.log(`  Diag: ${JSON.stringify(result.diagnostics)}`);
    }
});
