#!/usr/bin/env node
/**
 * Processes raw OpenSidewalks data into normalized accessibility segments.
 *
 * Usage:
 *   node scripts/process_accessibility.js
 *
 * Environment variables:
 *   OPENSIDEWALKS_PATH       - optional path to the raw GeoJSON file.
 *   ACCESSIBILITY_OUTPUT_PATH - optional path for the processed JSON.
 */

const fs = require('fs');
const path = require('path');

const {
  loadOpenSidewalksSegments,
  loadVenueAccessibility,
  buildAccessibleSegments,
} = require('../src/services/accessibility/aggregator');

const OUTPUT_PATH =
  process.env.ACCESSIBILITY_OUTPUT_PATH ||
  path.join(__dirname, '..', 'data', 'processed', 'accessible_segments.json');

async function main() {
  try {
    console.log('Loading OpenSidewalks segments...');
    const sidewalkSegments = await loadOpenSidewalksSegments(process.env.OPENSIDEWALKS_PATH);
    console.log(`Loaded ${sidewalkSegments.length} sidewalk features.`);

    const venueAccessibility = await loadVenueAccessibility();
    if (venueAccessibility.length) {
      console.log(`Loaded ${venueAccessibility.length} venue accessibility records.`);
    }

    const normalizedSegments = buildAccessibleSegments(sidewalkSegments, venueAccessibility);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    const payload = {
      generated_at: new Date().toISOString(),
      segment_count: normalizedSegments.length,
      segments: normalizedSegments,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`Saved normalized accessibility data to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('Failed to process accessibility data:', err);
    process.exitCode = 1;
  }
}

main();
