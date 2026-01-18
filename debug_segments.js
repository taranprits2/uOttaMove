const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('server/data/processed/accessible_segments.json', 'utf8'));
const segments = data.segments;

const start = [45.4241, -75.6579];
const end = [45.4270, -75.6549];

function dist(c1, c2) {
    return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
}

let nearStart = 0;
let nearEnd = 0;

segments.forEach(s => {
    const coords = s.geometry.coordinates;
    coords.forEach(c => {
        // c is [lon, lat]
        if (dist([c[1], c[0]], start) < 0.002) nearStart++;
        if (dist([c[1], c[0]], end) < 0.002) nearEnd++;
    });
});

console.log(`Near start: ${nearStart} segment points`);
console.log(`Near end: ${nearEnd} segment points`);
