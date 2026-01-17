const { findAccessibleWalkingRoute } = require('./walking_router');
const { planAccessibleTrip } = require('./transit_router');

const WALKING_SPEED_MPS = 1.15; // ~4.1 km/h, conservative accessible pace

function normalizeCoordinate(coord, label) {
  if (
    !coord ||
    typeof coord.lat !== 'number' ||
    (typeof coord.lon !== 'number' && typeof coord.lng !== 'number')
  ) {
    throw new Error(`${label}.lat and ${label}.lon are required numbers`);
  }
  return {
    lat: coord.lat,
    lon: typeof coord.lon === 'number' ? coord.lon : coord.lng,
    label: coord.label || coord.name || null,
    raw: coord,
  };
}

function estimateDurationMinutes(distanceMeters, speedMps = WALKING_SPEED_MPS) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return 0;
  }
  return distanceMeters / speedMps / 60;
}

function collectSegmentInsights(segments = []) {
  const issues = {};
  segments.forEach((segment) => {
    (segment.issues || []).forEach((issue) => {
      issues[issue] = (issues[issue] || 0) + 1;
    });
  });
  return issues;
}

function buildWalkingLeg(routeResult, disabilityType) {
  const {
    metrics,
    polyline,
    segments,
    start: snappedStart,
    end: snappedEnd,
  } = routeResult;

  const distance = metrics.total_distance_m ?? 0;
  const duration = estimateDurationMinutes(distance);

  return {
    id: 'leg_1',
    mode: 'walking',
    disabilityType,
    distance_m: distance,
    duration_min: duration,
    geometry: polyline,
    start: snappedStart,
    end: snappedEnd,
    accessibility: {
      average_score: metrics.average_accessibility_score ?? null,
      accessible_segment_ratio: metrics.accessible_segment_ratio ?? null,
      start_distance_to_network_m: metrics.start_distance_to_network_m ?? null,
      end_distance_to_network_m: metrics.end_distance_to_network_m ?? null,
      segment_issues: collectSegmentInsights(segments),
    },
    segments,
    guidance: segments.map((segment, idx) => ({
      index: idx,
      summary: segment.accessible
        ? 'Proceed along accessible segment'
        : 'Proceed with caution (limited accessibility)',
      distance_m: segment.length ?? null,
      issues: segment.issues || [],
      confidence: segment.confidence || null,
    })),
  };
}

function buildRouteEnvelope({ start, end, disabilityType, transportationMode, legs, warnings }) {
  const totalDistance = legs.reduce((sum, leg) => sum + (leg.distance_m || 0), 0);
  const totalDuration = legs.reduce((sum, leg) => sum + (leg.duration_min || 0), 0);

  return {
    id: `route_${Date.now()}`,
    type: transportationMode === 'walking' ? 'accessible-walking' : 'accessible-trip',
    disabilityType,
    transportationMode,
    start,
    end,
    legs,
    summary: {
      total_distance_m: totalDistance,
      total_duration_min: totalDuration,
      legs: legs.length,
    },
    warnings,
  };
}

function buildWarnings(routeResult) {
  const warnings = [];
  const startOffset = routeResult.metrics?.start_distance_to_network_m;
  const endOffset = routeResult.metrics?.end_distance_to_network_m;

  if (Number.isFinite(startOffset) && startOffset > 50) {
    warnings.push(
      'Your current location is far from the accessible network; expect an unsnapped approach.',
    );
  }
  if (Number.isFinite(endOffset) && endOffset > 50) {
    warnings.push(
      'Your destination is far from the accessible network; final meters may be unverified.',
    );
  }
  if (!routeResult.segments?.length) {
    warnings.push('No detailed segments returned for this route.');
  }
  return warnings;
}

function noRouteError(details) {
  const err = new Error('Unable to generate an accessible route between these points.');
  err.code = 'no_accessible_route';
  err.details = details;
  return err;
}

async function handleWalkingRouting(startLatLon, endLatLon, options, disabilityType) {
  const result = findAccessibleWalkingRoute(startLatLon, endLatLon, options);
  if (!result || !result.success) {
    throw noRouteError(result);
  }

  const leg = buildWalkingLeg(result, disabilityType);
  const warnings = buildWarnings(result);

  return buildRouteEnvelope({
    start: { requested: startLatLon, snapped: result.start },
    end: { requested: endLatLon, snapped: result.end },
    disabilityType,
    transportationMode: 'walking',
    legs: [leg],
    warnings,
  });
}

async function handleTransitRouting(startLatLon, endLatLon, options, disabilityType) {
  const trip = await planAccessibleTrip(startLatLon, endLatLon, { ...options, useTransit: true });
  if (!trip || !trip.legs?.length) {
    throw noRouteError(trip);
  }

  const walkingLeg = trip.legs[0];
  // When transit is unimplemented, the trip falls back to the walking router.
  const leg =
    walkingLeg.mode === 'WALK' && walkingLeg.success
      ? buildWalkingLeg(walkingLeg, disabilityType)
      : {
          id: 'leg_1',
          mode: walkingLeg.mode || 'transit',
          disabilityType,
          distance_m: walkingLeg.metrics?.total_distance_m ?? null,
          duration_min: estimateDurationMinutes(walkingLeg.metrics?.total_distance_m ?? 0),
          geometry: walkingLeg.polyline || [],
          segments: walkingLeg.segments || [],
          accessibility: {
            average_score: walkingLeg.metrics?.average_accessibility_score ?? null,
            accessible_segment_ratio: walkingLeg.metrics?.accessible_segment_ratio ?? null,
            segment_issues: collectSegmentInsights(walkingLeg.segments),
          },
        };

  const warnings = [
    ...(trip.warnings || []),
    ...(walkingLeg.success ? buildWarnings(walkingLeg) : []),
  ];

  return buildRouteEnvelope({
    start: { requested: startLatLon },
    end: { requested: endLatLon },
    disabilityType,
    transportationMode: 'transit',
    legs: [leg],
    warnings,
  });
}

async function generateAccessibleRoute({
  start,
  end,
  disabilityType = 'wheelchair',
  transportationMode = 'walking',
  options = {},
} = {}) {
  const normalizedStart = normalizeCoordinate(start, 'start');
  const normalizedEnd = normalizeCoordinate(end, 'end');
  const startLatLon = [normalizedStart.lat, normalizedStart.lon];
  const endLatLon = [normalizedEnd.lat, normalizedEnd.lon];

  if (transportationMode === 'walking') {
    return handleWalkingRouting(startLatLon, endLatLon, options, disabilityType);
  }

  if (transportationMode === 'transit') {
    return handleTransitRouting(startLatLon, endLatLon, options, disabilityType);
  }

  // Unknown mode: fall back to walking but include a warning so the caller knows.
  const route = await handleWalkingRouting(startLatLon, endLatLon, options, disabilityType);
  route.warnings = [
    ...(route.warnings || []),
    `Transportation mode "${transportationMode}" is not supported yet; defaulted to walking.`,
  ];
  route.transportationMode = 'walking';
  return route;
}

module.exports = {
  generateAccessibleRoute,
};
