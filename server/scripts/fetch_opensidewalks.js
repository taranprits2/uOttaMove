#!/usr/bin/env node
/**
 * Fetches sidewalk/footway data for Toronto from the Overpass API
 * and converts it to GeoJSON compatible with OpenSidewalks processing steps.
 *
 * Usage:
 *   node scripts/fetch_opensidewalks.js
 *
 * Environment variables:
 *   OVERPASS_URL   - optional override for the Overpass endpoint
 *   TORONTO_BBOX   - optional bbox string "south,west,north,east"
 *   OUTPUT_PATH    - optional path for the GeoJSON output
 *
 * The default bounding box approximates downtown Toronto; override TORONTO_BBOX
 * for wider coverage (expect larger outputs).
 *
 * NOTE: Respect Overpass API usage policies. Avoid running too frequently.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const osmtogeojson = require('osmtogeojson');

const OVERPASS_URL = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const OTTAWA_BBOX = process.env.OTTAWA_BBOX || '45.35,-75.75,45.45,-75.65';
const OUTPUT_PATH =
  process.env.OUTPUT_PATH ||
  path.join(__dirname, '..', 'data', 'raw', 'opensidewalks', 'ottawa_sidewalks.geojson');

const QUERY = `
[out:json][timeout:180];
(
  way["highway"="footway"](${OTTAWA_BBOX});
  way["highway"="path"]["foot"!="no"](${OTTAWA_BBOX});
  way["highway"="pedestrian"](${OTTAWA_BBOX});
  way["sidewalk"](${OTTAWA_BBOX});
  way["footway"](${OTTAWA_BBOX});
  way["kerb"](${OTTAWA_BBOX});
);
out body;
>;
out skel qt;
`;

async function fetchOverpassData() {
  const params = new URLSearchParams({ data: QUERY });
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': process.env.OSM_USER_AGENT || 'newhacks2025-fetch/1.0 (contact@example.com)',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Overpass request failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('Fetching OpenStreetMap sidewalk data for Ottawa...');
    const overpassData = await fetchOverpassData();
    console.log(`Fetched ${overpassData.elements?.length || 0} OSM elements. Converting to GeoJSON...`);

    const geojson = osmtogeojson(overpassData, { polygonFeatures: { 'building': false } });

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson, null, 2));

    console.log(`Saved GeoJSON to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('Failed to fetch OpenSidewalks data:', err.message);
    process.exitCode = 1;
  }
}

main();
