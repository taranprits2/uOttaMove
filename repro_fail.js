const { findAccessibleWalkingRoute } = require('./server/src/services/routing/walking_router');

const start = [45.4238, -75.6792];
const end = [45.4246, -75.6791];

try {
    const result = findAccessibleWalkingRoute(start, end);
    console.log("Success:", result.success);
    if (!result.success) {
        console.log("Reason:", result.reason);
        console.log("Start Node:", result.start?.key, "Dist:", result.start?.distance);
        console.log("End Node:", result.end?.key, "Dist:", result.end?.distance);
    } else {
        console.log("Start Node:", result.start?.key, "Dist:", result.start?.distance);
        console.log("End Node:", result.end?.key, "Dist:", result.end?.distance);
        console.log("Distance:", result.metrics.total_distance_m);
        console.log("Segments:", result.segments.length);
        result.segments.forEach((s, i) => {
            console.log(`  Seg ${i}: ${s.id} score: ${s.score}`);
        });
    }
} catch (e) {
    console.error("Error:", e.message);
}
