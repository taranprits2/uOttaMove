const http = require('http');

const start = { lat: 45.4102, lon: -75.6944 };
const end = { lat: 45.4106, lon: -75.6933 };

const postData = JSON.stringify({ start, end });

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/routes/walking',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
    },
};

console.log('Sending request...');
const startTime = Date.now();

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`Response received in ${duration}ms`);
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
