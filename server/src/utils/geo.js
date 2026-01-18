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

function distanceSquared(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/**
 * Projects a point p onto the line segment defined by v and w.
 * @param {[number, number]} p - Point to project
 * @param {[number, number]} v - Start of segment
 * @param {[number, number]} w - End of segment
 * @returns {[number, number]} The projected point on the segment
 */
function projectPointOnSegment(p, v, w) {
  const l2 = distanceSquared(v, w);
  if (l2 === 0) return v;
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return [
    v[0] + t * (w[0] - v[0]),
    v[1] + t * (w[1] - v[1])
  ];
}

module.exports = {
  haversineDistance,
  EARTH_RADIUS_METERS,
  projectPointOnSegment,
  distanceSquared,
};
