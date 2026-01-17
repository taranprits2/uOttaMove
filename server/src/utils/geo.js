/**
 * Lightweight geographic helpers.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Haversine distance between two [lat, lon] pairs in meters.
 * @param {[number, number]} a
 * @param {[number, number]} b
 */
function haversineDistance(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h =
    sinLat * sinLat + Math.cos(radLat1) * Math.cos(radLat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

module.exports = {
  haversineDistance,
  EARTH_RADIUS_METERS,
};
