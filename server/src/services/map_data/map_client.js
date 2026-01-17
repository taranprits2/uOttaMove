/**
 * Lightweight OpenStreetMap client that provides helpers compatible with Leaflet.
 *
 * Leaflet itself runs in the front end; the backend just needs to supply
 * geocoding and metadata so the UI can render map tiles.
 *
 * Nominatim usage guidelines: https://operations.osmfoundation.org/policies/nominatim/
 * Make sure to set a descriptive User-Agent and stay within rate limits.
 */

const fetch = require('node-fetch');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.OSM_USER_AGENT || 'uOttaHack/1.0 (test@test.com)';

/**
 * Performs a forward geocode lookup using OpenStreetMap's Nominatim API.
 * @param {string} query - Free-text address or place query.
 * @param {object} [options]
 * @param {number} [options.limit=5] - Max number of results.
 * @returns {Promise<Array>} Array of place objects (compatible with Leaflet markers).
 */
async function searchPlaces(query, options = {}) {
  if (!query) {
    throw new Error('searchPlaces: query is required');
  }

  const limit = options.limit || 5;
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    polygon_geojson: '0',
    limit: String(limit),
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`searchPlaces: Nominatim responded with ${response.status}`);
  }

  return response.json();
}

/**
 * Reverse geocodes a latitude/longitude pair.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object>}
 */
async function reverseGeocode(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('reverseGeocode: lat and lon must be numbers');
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`reverseGeocode: Nominatim responded with ${response.status}`);
  }

  return response.json();
}

/**
 * Returns a tile URL template compatible with Leaflet's L.tileLayer.
 * You should proxy heavy traffic through your own tile server to respect usage limits.
 */
function getTileUrlTemplate() {
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}

module.exports = {
  NOMINATIM_BASE_URL,
  searchPlaces,
  reverseGeocode,
  getTileUrlTemplate,
};
