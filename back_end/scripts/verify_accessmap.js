require('dotenv').config({ path: '../.env' });
const accessmapService = require('../src/services/routing/accessmap.service');

async function verify() {
    console.log("Verifying AccessMap Service...");
    if (typeof accessmapService.getWalkingRoute !== 'function') {
        console.error("FAILED: getWalkingRoute is not a function");
        process.exit(1);
    }
    console.log("SUCCESS: getWalkingRoute is a function");

    // Optional: Try to fetch a route (will likely fail likely due to placeholder URL, but checks connection logic)
    try {
        await accessmapService.getWalkingRoute(
            { lat: 45.4215, lon: -75.6972 },
            { lat: 45.4248, lon: -75.6950 }
        );
        console.log("SUCCESS: Service call completed (unexpectedly if remote is placeholder)");
    } catch (error) {
        // This is expected if localhost:8000 is not running
        console.log("INFO: Service call failed as expected: " + error.message);
    }
    process.exit(0);
}

verify();
