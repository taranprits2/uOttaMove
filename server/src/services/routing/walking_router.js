const fs = require('fs');
const path = require('path');
const { haversineDistance, projectPointOnSegment, distanceSquared } = require('../../utils/geo');

const PROCESSED_SEGMENTS_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'processed',
  'accessible_segments.json',
);

function loadAccessibleSegments(filepath = PROCESSED_SEGMENTS_PATH) {
  const abspath = path.resolve(filepath);
  if (!fs.existsSync(abspath)) {
    throw new Error(
      `Accessible segments not found at ${abspath}. Run npm run process:accessibility first.`,
    );
  }
  const payload = JSON.parse(fs.readFileSync(abspath, 'utf8'));
  if (!Array.isArray(payload.segments)) {
    throw new Error('Expected "segments" array in accessible_segments.json');
  }
  return payload.segments;
}

function toLatLon(coord) {
  if (!Array.isArray(coord) || coord.length < 2) {
    throw new Error(`Invalid coordinate: ${coord}`);
  }
  const [lon, lat] = coord;
  return [lat, lon];
}

function coordKey([lat, lon]) {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function computeSegmentLengthMeters(coords) {
  let length = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = toLatLon(coords[i - 1]);
    const cur = toLatLon(coords[i]);
    length += haversineDistance(prev, cur);
  }
  return length;
}

function computePenalty(attributes) {
  // Score is now default 1.0 (good), so (1 - score) gives appropriate penalty for bad stuff.
  let penalty = Math.max(0, 1 - (attributes.accessibility_score ?? 1.0));

  const issues = attributes.issues || [];

  // Confidence Penalty Logic:
  // Low confidence now means "Explicit Negative Tags" found in aggregator, 
  // so we might not need an extra penalty if the score is already lowered, 
  // but adding a small "uncertainty" penalty or "risk" penalty for low confidence is safer.
  // Medium confidence is now NEUTRAL (unknown), so NO penalty.

  if (attributes.confidence === 'low') {
    // If confidence is low (explicit bad tags), the score should already be reflected.
    // However, we can add a small boost to the penalty to discourage it further.
    penalty += 0.1;
  }

  // Issue-specific penalties (additive on top of score drop)
  // These might double-dip since scoreSegment already drops score for these,
  // but doing it here ensures strong avoidance in the router graph weights.
  const issuePenaltyMap = {
    kerb_high: 0.5, // Increased from 0.3
    surface_gravel: 0.3,
    surface_cobblestone: 0.4,
    narrow_width: 0.3,
    steep_incline: 0.5,
    steps: 2.0, // Massive penalty for steps
    wheelchair_no: 1.0,
  };

  issues.forEach((issue) => {
    // Check if we have a specific penalty for this issue
    // (aggregator produces snake_case issues like 'wheelchair_no', 'kerb_high', etc.)
    if (issuePenaltyMap[issue]) {
      penalty += issuePenaltyMap[issue];
    } else if (issue.startsWith('surface_')) {
      // Generic surface badness
      penalty += 0.2;
    }
  });

  return penalty;
}

function buildGraph(segments, options = {}) {
  const {
    allowLimitedSegments = true,
    allowNonAccessible = false,
    limitedThreshold = 0.5,
  } = options;

  const nodes = new Map();
  const nodePositions = new Map();
  const coordCounts = new Map();

  // PASS 1: Count coordinate occurrences to identify intersections
  segments.forEach((segment) => {
    if (!segment.geometry || segment.geometry.type !== 'LineString') return;
    const coords = segment.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return;

    // We only care about unique coordinates within a single segment for *structure*,
    // but deeper logic: if a line crosses itself, that's an intersection too.
    // Simpler: just count every coordinate appearance.
    coords.forEach((c) => {
      const key = coordKey(toLatLon(c));
      coordCounts.set(key, (coordCounts.get(key) || 0) + 1);
    });
  });

  function addEdge(fromCoord, toCoord, segmentMeta, edgeMeta) {
    const key = coordKey(fromCoord);
    if (!nodes.has(key)) {
      nodes.set(key, []);
      nodePositions.set(key, fromCoord);
    }
    nodes.get(key).push({
      to: coordKey(toCoord),
      toCoord,
      weight: edgeMeta.weight,
      distance: edgeMeta.distance,
      segment: segmentMeta,
    });
  }

  // PASS 2: Build graph, splitting segments at critical nodes (intersections)
  segments.forEach((segment) => {
    if (!segment.geometry || segment.geometry.type !== 'LineString') return;
    const coords = segment.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return;

    const attributes = segment.attributes || {};
    const accessible = attributes.is_wheelchair_passable === true;
    const score = attributes.accessibility_score ?? 0.5;

    let penaltyMultiplier = 1;
    if (!accessible) {
      if (score < limitedThreshold) {
        penaltyMultiplier = 10;
      } else {
        penaltyMultiplier = 2.5;
      }
    }

    const penalty = computePenalty(attributes);
    const baseSegmentMeta = {
      id: segment.segment_id || null,
      score,
      accessible,
      confidence: attributes.confidence || 'low',
      issues: attributes.issues || [],
      tags: attributes.tags || {},
    };

    // Traverse the segment points
    let startIndex = 0;
    let currentDistance = 0;

    for (let i = 1; i < coords.length; i++) {
      const prev = toLatLon(coords[i - 1]);
      const cur = toLatLon(coords[i]);
      const dist = haversineDistance(prev, cur);
      currentDistance += dist;

      const curKey = coordKey(cur);
      const isEndpoint = i === coords.length - 1;
      const isIntersection = (coordCounts.get(curKey) || 0) > 1;

      if (isEndpoint || isIntersection) {
        // Critical Node hit: Create edge from startIndex to i
        const subSegmentCoords = coords.slice(startIndex, i + 1); // Extract geometry for this specific chunk
        const pathLatLon = subSegmentCoords.map(toLatLon);

        // Weight for this specific sub-segment
        const weight = currentDistance * (1 + penalty) * penaltyMultiplier;

        const startCoord = pathLatLon[0];
        const endCoord = pathLatLon[pathLatLon.length - 1];

        // Forward Edge
        addEdge(
          startCoord,
          endCoord,
          {
            ...baseSegmentMeta,
            path: pathLatLon.slice(),
            direction: 'forward',
            length: currentDistance
          },
          { weight, distance: currentDistance }
        );

        // Reverse Edge
        addEdge(
          endCoord,
          startCoord,
          {
            ...baseSegmentMeta,
            path: pathLatLon.slice().reverse(),
            direction: 'reverse',
            length: currentDistance
          },
          { weight, distance: currentDistance }
        );

        // Reset for next sub-segment
        startIndex = i;
        currentDistance = 0;
      }
    }
  });

  return { nodes, nodePositions };
}

function findNearestNode(coord, nodePositions) {
  const target = coord;
  let nearestKey = null;
  let minDist = Infinity;
  for (const [key, position] of nodePositions.entries()) {
    const dist = haversineDistance(target, position);
    if (dist < minDist) {
      minDist = dist;
      nearestKey = key;
    }
  }
  return { key: nearestKey, distance: minDist, coord: nodePositions.get(nearestKey) };
}

class MinHeap {
  constructor() {
    this.data = [];
  }

  insert(item) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  bubbleUp(index) {
    let i = index;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent].priority <= this.data[i].priority) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  extractMin() {
    if (this.data.length === 0) return null;
    const min = this.data[0];
    const end = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = end;
      this.sinkDown(0);
    }
    return min;
  }

  sinkDown(index) {
    let i = index;
    const length = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < length && this.data[left].priority < this.data[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.data[right].priority < this.data[smallest].priority) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }

  isEmpty() {
    return this.data.length === 0;
  }
}

function dijkstra(graph, startKey, endKey) {
  const distances = new Map();
  const previous = new Map();
  const edgeUsed = new Map();
  const queue = new MinHeap();

  for (const key of graph.nodes.keys()) {
    distances.set(key, Infinity);
  }
  distances.set(startKey, 0);
  queue.insert({ node: startKey, priority: 0 });

  while (!queue.isEmpty()) {
    const { node: currentKey } = queue.extractMin();
    if (currentKey === endKey) break;
    const neighbors = graph.nodes.get(currentKey) || [];
    neighbors.forEach((edge) => {
      const alt = distances.get(currentKey) + edge.weight;
      if (alt < distances.get(edge.to)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, currentKey);
        edgeUsed.set(edge.to, edge);
        queue.insert({ node: edge.to, priority: alt });
      }
    });
  }

  if (!previous.has(endKey) && startKey !== endKey) {
    return null;
  }

  const pathKeys = [];
  const segments = [];
  let current = endKey;
  while (current && current !== startKey) {
    pathKeys.push(current);
    const edge = edgeUsed.get(current);
    if (edge) {
      segments.push(edge.segment);
    }
    current = previous.get(current);
  }
  pathKeys.push(startKey);
  pathKeys.reverse();
  segments.reverse();

  const pathCoords = pathKeys.map((key) => graph.nodePositions.get(key));
  const totalDistance = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
  const avgScore =
    segments.reduce((sum, seg) => sum + (seg.score ?? 0.5), 0) / (segments.length || 1);
  const accessibleSegments = segments.filter((seg) => seg.accessible).length;

  const polyline = [];
  segments.forEach((seg, segIndex) => {
    seg.path.forEach((coord, coordIndex) => {
      if (segIndex > 0 && coordIndex === 0) return;
      polyline.push(coord);
    });
  });

  return {
    path: pathCoords,
    segments,
    polyline,
    metrics: {
      total_distance_m: totalDistance,
      total_cost: distances.get(endKey),
      average_accessibility_score: avgScore,
      accessible_segment_ratio: segments.length
        ? accessibleSegments / segments.length
        : 0,
    },
  };
}

/**
 * Finds an accessible walking route between two coordinates.
 * @param {[number, number]} startLatLon [lat, lon]
 * @param {[number, number]} endLatLon [lat, lon]
 * @param {object} options
 */
function injectPointIntoSegments(latLon, segments) {
  const [lat, lon] = latLon;
  const point = [lat, lon];
  let minDistanceSq = Infinity;
  let closestSegmentIndex = -1;
  let closestProjected = null;
  let splitIndex = -1;

  // Find closest segment and point
  segments.forEach((seg, index) => {
    if (!seg.geometry || seg.geometry.type !== 'LineString') return;
    const coords = seg.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return;

    for (let i = 1; i < coords.length; i++) {
      // geometry.coordinates are [lon, lat]
      const p1 = [coords[i - 1][1], coords[i - 1][0]];
      const p2 = [coords[i][1], coords[i][0]];
      const proj = projectPointOnSegment(point, p1, p2);
      const dSq = distanceSquared(point, proj);

      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestSegmentIndex = index;
        closestProjected = proj;
        splitIndex = i;
      }
    }
  });

  if (closestSegmentIndex !== -1 && closestProjected) {
    const originalSeg = segments[closestSegmentIndex];
    const coords = originalSeg.geometry.coordinates;
    // Note: Coordinates are [lon, lat]
    const newCoord = [closestProjected[1], closestProjected[0]];

    // Split into two segments
    const coords1 = [...coords.slice(0, splitIndex), newCoord];
    const coords2 = [newCoord, ...coords.slice(splitIndex)];

    const seg1 = {
      ...originalSeg,
      segment_id: `${originalSeg.segment_id}_split_1`,
      geometry: { ...originalSeg.geometry, coordinates: coords1 }
    };
    const seg2 = {
      ...originalSeg,
      segment_id: `${originalSeg.segment_id}_split_2`,
      geometry: { ...originalSeg.geometry, coordinates: coords2 }
    };

    // Replace original segment with the two new ones
    segments.splice(closestSegmentIndex, 1, seg1, seg2);

    return closestProjected; // [lat, lon]
  }
  return null;
}


/**
 * Finds an accessible walking route between two coordinates.
 * @param {[number, number]} startLatLon [lat, lon]
 * @param {[number, number]} endLatLon [lat, lon]
 * @param {object} options
 */
function findAccessibleWalkingRoute(startLatLon, endLatLon, options = {}) {
  // Deep clone segments to avoid mutating the cached/singleton data if any
  const rawSegments = loadAccessibleSegments(options.accessibleSegmentsPath);
  // We must clone because we inject points now
  const segments = JSON.parse(JSON.stringify(rawSegments));

  // Inject start and end points
  // We prefer the projected point for the result logic
  const snaptStart = injectPointIntoSegments(startLatLon, segments);
  const snapEnd = injectPointIntoSegments(endLatLon, segments);

  // If injection fails (too far?), we fall back to original search, but likely graph building will handle it or fail as before.
  const routeStart = snaptStart || startLatLon;
  const routeEnd = snapEnd || endLatLon;

  const graph = buildGraph(segments, options);

  // Use the projected points to find nearest node - they should be EXACT matches now
  const start = findNearestNode(routeStart, graph.nodePositions);
  const end = findNearestNode(routeEnd, graph.nodePositions);

  if (!start.key || !end.key) {
    throw new Error('Unable to project start or end coordinate onto the accessible network.');
  }

  const result = dijkstra(graph, start.key, end.key);
  if (!result) {
    return {
      success: false,
      reason: 'no_path_found',
      start: { ...start, requested: startLatLon },
      end: { ...end, requested: endLatLon },
    };
  }

  const startOffset = start.coord ? haversineDistance(startLatLon, start.coord) : null;
  const endOffset = end.coord ? haversineDistance(endLatLon, end.coord) : null;
  const fullPolyline = [
    startLatLon,
    ...(result.polyline.length ? result.polyline : []),
    endLatLon,
  ];

  return {
    success: true,
    start: { ...start, requested: startLatLon, offset_m: startOffset },
    end: { ...end, requested: endLatLon, offset_m: endOffset },
    path: result.path,
    segments: result.segments,
    polyline: fullPolyline,
    metrics: {
      ...result.metrics,
      start_distance_to_network_m: startOffset ?? 0,
      end_distance_to_network_m: endOffset ?? 0,
    },
  };
}

module.exports = {
  loadAccessibleSegments,
  buildGraph,
  findAccessibleWalkingRoute,
};
