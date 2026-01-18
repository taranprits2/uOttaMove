const fs = require('fs');
const path = require('path');

/**
 * Accessibility data aggregator.
 *
 * Responsibilities:
 *  - Load OpenSidewalks sidewalk segments for Toronto (GeoJSON).
 *  - Merge venue-level accessibility signals from Wheelmap.org / AccessNow.
 *  - Produce normalized segment records scored for wheelchair accessibility.
 */

const DEFAULT_RAW_GEOJSON_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'raw',
  'opensidewalks',
  'ottawa_sidewalks.geojson',
);

/**
 * Loads raw OpenSidewalks data for the configured city.
 * @param {string} [filepath]
 * @returns {Promise<Array>} Array of raw GeoJSON feature objects.
 */
async function loadOpenSidewalksSegments(filepath = DEFAULT_RAW_GEOJSON_PATH) {
  const abspath = path.resolve(filepath);
  if (!fs.existsSync(abspath)) {
    throw new Error(`OpenSidewalks GeoJSON not found at ${abspath}. Run npm run fetch:opensidewalks first.`);
  }

  const geojson = JSON.parse(fs.readFileSync(abspath, 'utf8'));
  if (!Array.isArray(geojson.features)) {
    throw new Error(`Unexpected GeoJSON structure in ${abspath}`);
  }

  return geojson.features;
}

/**
 * Fetches Wheelmap / AccessNow venue accessibility data.
 * Stub for now – returns an empty array so downstream logic can proceed.
 * @returns {Promise<Array>} Array of POI accessibility records.
 */
async function loadVenueAccessibility() {
  console.warn('loadVenueAccessibility: Wheelmap/AccessNow integration not implemented yet.');
  return [];
}

const GOOD_SURFACES = new Set(['asphalt', 'paved', 'concrete', 'concrete:lanes', 'paving_stones']);
const BAD_SURFACES = new Set(['gravel', 'dirt', 'ground', 'grass', 'cobblestone', 'sand', 'woodchips']);
const BAD_SMOOTHNESS = new Set(['bad', 'very_bad', 'horrible', 'very_horrible', 'impassable']);
const GOOD_SMOOTHNESS = new Set(['excellent', 'good', 'intermediate']);

function parseIncline(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Math.abs(value);
  const str = String(value).trim().toLowerCase();
  if (str === 'up' || str === 'down') return 0.06;
  const percentMatch = str.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (percentMatch) {
    return Math.abs(parseFloat(percentMatch[1]) / 100);
  }
  const numeric = parseFloat(str);
  if (!Number.isNaN(numeric)) {
    return Math.abs(numeric);
  }
  return null;
}

function parseWidth(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const numeric = parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isNaN(numeric) ? null : numeric;
}

/**
 * Computes an accessibility score for a sidewalk segment.
 * @param {object} properties - GeoJSON feature properties.
 * @returns {{score:number,isAccessible:boolean,confidence:string,issues:string[],tags:object}}
 */
function scoreSegment(properties = {}) {
  // Rule 1: Default Assumption = Mostly Accessible but Unverified (0.9)
  // This allows "verified good" (1.0) to stand out from "unknown" (0.9).
  let score = 0.9;
  const issues = [];
  let signals = 0;
  let positiveSignals = 0;
  let negativeSignals = 0;

  const tagsUsed = {};

  // -- Helper to apply penalty/bonus --
  const apply = (val, reason) => {
    score += val;
    if (val < 0) {
      issues.push(reason);
      negativeSignals++;
    } else if (val > 0) {
      positiveSignals++;
    }
    signals++;
  };

  const wheelchair = properties.wheelchair || properties['sidewalk:wheelchair'];
  if (wheelchair) {
    tagsUsed.wheelchair = wheelchair;
    if (wheelchair === 'yes') {
      apply(0.1, 'wheelchair_yes'); // Confirmed good, brings 0.9 -> 1.0
      positiveSignals++; // Strong signal
    } else if (wheelchair === 'limited') {
      apply(-0.2, 'wheelchair_limited');
    } else if (wheelchair === 'no') {
      apply(-0.8, 'wheelchair_no');
    }
  }

  const kerb = properties.kerb || properties['kerb:height'];
  if (kerb) {
    tagsUsed.kerb = kerb;
    if (typeof kerb === 'string') {
      const value = kerb.toLowerCase();
      if (value.includes('lowered') || value.includes('flush') || value === 'raised:0') {
        apply(0.05, 'kerb_flush'); // Bonus check
        positiveSignals++;
      } else if (value.includes('raised') || value.includes('high')) {
        apply(-0.4, 'kerb_high');
      }
    }
  }

  const surface = properties.surface || properties['sidewalk:surface'];
  if (surface) {
    tagsUsed.surface = surface;
    const normalizedSurface = surface.toLowerCase();
    if (GOOD_SURFACES.has(normalizedSurface)) {
      apply(0.05, 'surface_good'); // Bonus check
      positiveSignals++; // Weak positive
    } else if (BAD_SURFACES.has(normalizedSurface)) {
      apply(-0.3, `surface_${normalizedSurface}`);
    }
  }

  const smoothness = properties.smoothness || properties['sidewalk:smoothness'];
  if (smoothness) {
    tagsUsed.smoothness = smoothness;
    const normalizedSmoothness = smoothness.toLowerCase();
    if (GOOD_SMOOTHNESS.has(normalizedSmoothness)) {
      apply(0.05, 'smoothness_good'); // Bonus check
      positiveSignals++;
    } else if (BAD_SMOOTHNESS.has(normalizedSmoothness)) {
      apply(-0.5, `smoothness_${normalizedSmoothness}`);
    }
  }

  const inclineRaw = properties.incline || properties['sidewalk:incline'];
  const incline = parseIncline(inclineRaw);
  if (incline !== null) {
    tagsUsed.incline = inclineRaw;
    if (incline <= 0.06) {
      apply(0.0, 'incline_good'); // No bonus, just not a penalty
    } else if (incline > 0.08) {
      apply(-0.4, 'steep_incline');
    }
  }

  const widthRaw = properties.width || properties['sidewalk:width'];
  const width = parseWidth(widthRaw);
  if (width !== null) {
    tagsUsed.width = widthRaw;
    if (width < 1.0) { // Relaxed valid width slightly
      apply(-0.3, 'narrow_width');
    } else if (width >= 1.5) {
      apply(0.05, 'width_good'); // Bonus for wide paths
    }
  }

  // Explicit Barriers
  if (properties.highway === 'steps') {
    apply(-0.9, 'steps');
  }

  score = Math.max(0, Math.min(1, score));

  // -- Confidence Logic --
  // High: Strong positive signals OR explicit confirmation
  // Medium: Default / Unknown (Neutral)
  // Low: Explicit negative signals found

  let confidence = 'medium';

  if (positiveSignals >= 2 || (wheelchair === 'yes')) {
    confidence = 'high';
  }

  // If we found issues, confidence in "accessibility" decreases? 
  // No, the user wants: "Low: Explicit negative tags"
  // Actually, wait. The user request said:
  // "Low: Explicit negative tags (stairs, raised kerbs, steep incline)"
  // "Medium: Neutral / inferred (no relevant tags)"
  // "High: Explicit positive tags"

  if (negativeSignals > 0) {
    confidence = 'low'; // We are confident it is BAD, or effectively "low accessibility confidence"
  }

  const isAccessible = score >= 0.6; // Threshold for binary "passable"

  const relevantTags = {
    highway: properties.highway,
    foot: properties.foot,
    surface: surface || null,
    smoothness: smoothness || null,
    kerb: kerb || null,
    incline: inclineRaw || null,
    width: widthRaw || null,
    wheelchair: wheelchair || null,
  };

  return { score, isAccessible, confidence, issues, tags: relevantTags };
}

/**
 * Normalizes raw data into the format expected by the routing engine.
 * @param {Array} sidewalkSegments
 * @param {Array} venueAccessibility
 * @returns {Array} Normalized segments with accessibility metadata.
 */
function buildAccessibleSegments(sidewalkSegments, venueAccessibility = []) {
  const venueLookup = new Map();
  venueAccessibility.forEach((venue) => {
    const id = venue.segment_id || venue.osm_way_id;
    if (!id) return;
    if (!venueLookup.has(id)) {
      venueLookup.set(id, []);
    }
    venueLookup.get(id).push({
      source: venue.source || 'wheelmap',
      score: venue.score ?? venue.wheelchair,
    });
  });

  return sidewalkSegments.map((segment) => {
    const segmentId = segment.properties?.id || segment.id || null;
    const analysis = scoreSegment(segment.properties);

    const venues = venueLookup.get(segmentId) || [];
    if (venues.length > 0) {
      analysis.confidence = analysis.confidence === 'high' ? 'high' : 'medium';
    }

    return {
      segment_id: segmentId,
      osm_type: segment.properties?.id?.split('/')?.[0] || 'way',
      geometry: segment.geometry,
      attributes: {
        accessibility_score: analysis.score,
        is_wheelchair_passable: analysis.isAccessible,
        confidence: analysis.confidence,
        issues: analysis.issues,
        tags: analysis.tags,
      },
      sources: ['opensidewalks'],
      venue_scores: venues,
    };
  });
}

module.exports = {
  loadOpenSidewalksSegments,
  loadVenueAccessibility,
  buildAccessibleSegments,
  scoreSegment,
};
