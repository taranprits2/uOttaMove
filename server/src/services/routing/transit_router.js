/**
 * Accessible transit planner skeleton.
 *
 * This module demonstrates how to combine first/last-mile accessible walking
 * segments with transit legs that support wheelchair users. Actual transit
 * integration requires GTFS data (routes, stops, schedules) and real-time
 * accessibility feeds (elevator outages, low-floor bus assignments, etc.).
 *
 * TODO:
 *  - Import GTFS-static data and filter stops/stations with wheelchair access.
 *  - Ingest service alerts / elevator outages to avoid inaccessible transfers.
 *  - Run a multi-modal routing algorithm (e.g., RAPTOR) constrained by accessibility.
 */

const { findAccessibleWalkingRoute } = require('./walking_router');

/**
 * Plans a basic accessible trip by combining walking legs.
 * Currently returns a stub that uses walking-only routing for the entire trip.
 * Extend this to add transit legs once GTFS data is available.
 *
 * @param {[number, number]} originLatLon [lat, lon]
 * @param {[number, number]} destinationLatLon [lat, lon]
 * @param {object} options { accessibleSegmentsPath, maxWalkMeters, useTransit }
 */
async function planAccessibleTrip(originLatLon, destinationLatLon, options = {}) {
  const { useTransit = false } = options;

  if (!useTransit) {
    const walkingResult = findAccessibleWalkingRoute(originLatLon, destinationLatLon, options);
    return {
      mode: 'walking_only',
      legs: [
        {
          mode: 'WALK',
          summary: 'Accessible walking route',
          ...walkingResult,
        },
      ],
    };
  }

  // Placeholder implementation: in the absence of transit data, return walking.
  return {
    mode: 'walking_only',
    warnings: [
      'Transit integration not yet implemented; falling back to walking route.',
    ],
    legs: [
      {
        mode: 'WALK',
        summary: 'Accessible walking route',
        ...findAccessibleWalkingRoute(originLatLon, destinationLatLon, options),
      },
    ],
  };
}

module.exports = {
  planAccessibleTrip,
};
