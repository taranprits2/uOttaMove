const fs = require('fs');
const path = require('path');
const { haversineDistance } = require('../../utils/geo');

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
  let penalty = Math.max(0, 1 - (attributes.accessibility_score ?? 0.5));
  const issues = attributes.issues || [];
  if (attributes.confidence === 'low') {
    penalty += 0.35;
  } else if (attributes.confidence === 'medium') {
    penalty += 0.15;
  }

  const issuePenaltyMap = {
    kerb_high: 0.3,
    surface_gravel: 0.25,
    surface_cobblestone: 0.3,
    narrow_width: 0.2,
    steep_incline: 0.35,
  };
  issues.forEach((issue) => {
    if (issuePenaltyMap[issue]) {
      penalty += issuePenaltyMap[issue];
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

  function addEdge(fromCoord, toCoord, segment, metadata) {
    const key = coordKey(fromCoord);
    if (!nodes.has(key)) {
      nodes.set(key, []);
      nodePositions.set(key, fromCoord);
    }
    nodes.get(key).push({
      to: coordKey(toCoord),
      toCoord,
      weight: metadata.weight,
      distance: metadata.distance,
      segment,
    });
  }

  segments.forEach((segment) => {
    if (!segment.geometry || segment.geometry.type !== 'LineString') {
      return;
    }
    const coords = segment.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return;
    }

    const attributes = segment.attributes || {};
    const accessible = attributes.is_wheelchair_passable === true;
    const score = attributes.accessibility_score ?? 0.5;

    let penaltyMultiplier = 1;

    if (!accessible) {
      if (score < limitedThreshold) {
        // Very high penalty for non-accessible/low-score segments
        penaltyMultiplier = 10;
      } else {
        // Moderate penalty for limited segments
        penaltyMultiplier = 2.5;
      }
    }

    const pathLatLon = coords.map(toLatLon);
    const lengthMeters = computeSegmentLengthMeters(coords);
    const penalty = computePenalty(attributes);
    const weight = lengthMeters * (1 + penalty) * penaltyMultiplier;
    const baseSegmentMeta = {
      id: segment.segment_id || null,
      score,
      accessible,
      confidence: attributes.confidence || 'low',
      issues: attributes.issues || [],
      weight,
      length: lengthMeters,
      tags: attributes.tags || {},
    };

    const start = pathLatLon[0];
    const end = pathLatLon[pathLatLon.length - 1];
    addEdge(
      start,
      end,
      { ...baseSegmentMeta, path: pathLatLon.slice(), direction: 'forward' },
      { weight, distance: lengthMeters },
    );
    addEdge(
      end,
      start,
      { ...baseSegmentMeta, path: pathLatLon.slice().reverse(), direction: 'reverse' },
      { weight, distance: lengthMeters },
    );
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
function findAccessibleWalkingRoute(startLatLon, endLatLon, options = {}) {
  const segments = loadAccessibleSegments(options.accessibleSegmentsPath);
  const graph = buildGraph(segments, options);
  const start = findNearestNode(startLatLon, graph.nodePositions);
  const end = findNearestNode(endLatLon, graph.nodePositions);

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
