const fetch = require('node-fetch');

async function testRoute() {
    const start = { lat: 45.4241, lon: -75.6579 };
    const end = { lat: 45.4270, lon: -75.6549 };

    console.log("Sending request to API...");
    const url = 'http://localhost:3001/api/routes/walking';

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 30000); // 30s timeout

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ start, end }),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });

        clearTimeout(timeout);

        console.log(`Response status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log("Success! Route found.");
            // console.log(JSON.stringify(data, null, 2));
        } else {
            console.log("Error response:");
            console.log(await response.text());
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log("Request timed out after 30s!");
        } else {
            console.error("Request failed:", err);
        }
    }
}

testRoute();
