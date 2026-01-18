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

let cachedGraph = null;
let cachedSegments = null;

function loadAccessibleSegments() {
  if (cachedSegments) return cachedSegments;
  if (fs.existsSync(PROCESSED_SEGMENTS_PATH)) {
    const data = JSON.parse(fs.readFileSync(PROCESSED_SEGMENTS_PATH, 'utf8'));
    cachedSegments = data.segments || data.features || data || [];
    return cachedSegments;
  }
  return [];
}

function toLatLon(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return [0, 0];
  const [lon, lat] = coord;
  return [lat, lon];
}

function coordKey([lat, lon]) {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function projectPointOnSegment(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return a;
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  return [ax + clampedT * dx, ay + clampedT * dy];
}

function buildGraph(segments) {
  if (cachedGraph) return cachedGraph;

  const adj = new Map();
  const nodePositions = new Map();
  const spatialGrid = new Map();
  const allEdges = [];
  const gridSize = 3000;

  function getGridKey([lat, lon]) {
    return `${Math.floor(lat * gridSize)},${Math.floor(lon * gridSize)}`;
  }

  function addNodeToGrid(key, pos) {
    const gK = getGridKey(pos);
    if (!spatialGrid.has(gK)) spatialGrid.set(gK, []);
    spatialGrid.get(gK).push({ key, pos });
  }

  function addEdge(fromCoord, toCoord, segmentMeta, weight, distance) {
    const fK = coordKey(fromCoord);
    const tK = coordKey(toCoord);
    if (!adj.has(fK)) {
      adj.set(fK, []);
      nodePositions.set(fK, fromCoord);
      addNodeToGrid(fK, fromCoord);
    }
    if (!adj.has(tK)) {
      adj.set(tK, []);
      nodePositions.set(tK, toCoord);
      addNodeToGrid(tK, toCoord);
    }
    adj.get(fK).push({ to: tK, metadata: { ...segmentMeta, weight, distance } });
  }

  console.time('GraphBuild');
  console.log(`[Router] Building Graph (${segments.length} segments)...`);
  segments.forEach((seg) => {
    let coordsArr = [];
    if (seg.geometry.type === 'LineString') coordsArr = [seg.geometry.coordinates];
    else if (seg.geometry.type === 'MultiLineString') coordsArr = seg.geometry.coordinates;
    else return;

    const props = seg.properties || {};
    const score = props.accessibility_score || 0.7;
    let penalty = 1.0;
    if (score < 0.2) penalty = 50.0;
    else if (score < 0.4) penalty = 10.0;
    else if (score < 0.6) penalty = 3.0;

    coordsArr.forEach(coords => {
      const pathLL = coords.map(toLatLon);
      for (let i = 0; i < pathLL.length - 1; i++) {
        const p1 = pathLL[i], p2 = pathLL[i + 1], d = haversineDistance(p1, p2);
        const meta = { id: seg.id || `s-${Math.random()}`, score, props, path: [p1, p2] };
        addEdge(p1, p2, { ...meta, dir: 'f' }, d * penalty, d);
        addEdge(p2, p1, { ...meta, dir: 'b' }, d * penalty, d);
        allEdges.push({ a: p1, b: p2, aKey: coordKey(p1), bKey: coordKey(p2), meta, weight: d * penalty, distance: d });
      }
    });
  });

  console.log(`[Router] Welding junctions...`);
  let welds = 0;
  for (const [gK, points] of spatialGrid) {
    const [gx, gy] = gK.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neigh = spatialGrid.get(`${gx + dx},${gy + dy}`);
        if (!neigh) continue;
        for (const p1 of points) {
          for (const p2 of neigh) {
            if (p1.key === p2.key) continue;
            const d = haversineDistance(p1.pos, p2.pos);
            if (d < 15.0) {
              const weldMeta = { id: 'weld', score: 1.0, props: { highway: 'crossing' }, path: [p1.pos, p2.pos] };
              addEdge(p1.pos, p2.pos, weldMeta, d * 1.5, d);
              addEdge(p2.pos, p1.pos, weldMeta, d * 1.5, d);
              welds++;
            }
          }
        }
      }
    }
  }

  const components = findComponents(adj);
  const largestCompNodes = components[0] || [];
  const largestCompSet = new Set(largestCompNodes);

  console.timeEnd('GraphBuild');
  cachedGraph = { adj, nodePositions, allEdges, spatialGrid, largestComponent: largestCompSet, largestCompNodes, gridSize };
  console.log(`[Router] Graph construction complete. Graph has ${adj.size} nodes and ${allEdges.length} edges.`);
  return cachedGraph;
}

function findComponents(adj) {
  const visited = new Set(), comps = [];
  for (const node of adj.keys()) {
    if (visited.has(node)) continue;
    const comp = [], stack = [node]; visited.add(node);
    while (stack.length) {
      const curr = stack.pop(); comp.push(curr);
      for (const e of (adj.get(curr) || [])) {
        if (!visited.has(e.to)) { visited.add(e.to); stack.push(e.to); }
      }
    }
    comps.push(comp);
  }
  return comps.sort((a, b) => b.length - a.length);
}

class MinHeap {
  constructor() { this.data = []; }
  insert(item) { this.data.push(item); this.bubbleUp(this.data.length - 1); }
  isEmpty() { return this.data.length === 0; }
  bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.data[p].priority <= this.data[i].priority) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p;
    }
  }
  extractMin() {
    if (this.data.length === 0) return null;
    const min = this.data[0], end = this.data.pop();
    if (this.data.length > 0) { this.data[0] = end; this.sinkDown(0); }
    return min;
  }
  sinkDown(i) {
    const len = this.data.length;
    while (true) {
      let s = i; const l = 2 * i + 1, r = 2 * i + 2;
      if (l < len && this.data[l].priority < this.data[s].priority) s = l;
      if (r < len && this.data[r].priority < this.data[s].priority) s = r;
      if (s === i) break;[this.data[i], this.data[s]] = [this.data[s], this.data[i]]; i = s;
    }
  }
}

function dijkstra(adj, startKey, endKey) {
  const dists = new Map(), prev = new Map(), queue = new MinHeap();
  dists.set(startKey, 0); queue.insert({ node: startKey, priority: 0 });
  let iterations = 0;
  while (!queue.isEmpty()) {
    iterations++;
    if (iterations > 1000000) {
      console.error('[Router] Dijkstra exceeded 1M iterations. Aborting.');
      return null;
    }
    if (iterations % 100000 === 0) console.log(`[Router] Dijkstra iteration ${iterations}, queue size: ${queue.data.length}`);
    const { node: curr, priority: d } = queue.extractMin();
    if (d > (dists.get(curr) || Infinity)) continue;
    if (curr === endKey) break;
    for (const e of (adj.get(curr) || [])) {
      const alt = d + (e.metadata.weight || 1);
      if (alt < (dists.get(e.to) || Infinity)) {
        dists.set(e.to, alt); prev.set(e.to, { from: curr, edge: e });
        queue.insert({ node: e.to, priority: alt });
      }
    }
  }
  console.log(`[Router] Dijkstra completed in ${iterations} iterations`);
  if (!dists.has(endKey)) return null;
  const path = []; let c = endKey;
  while (prev.has(c)) { const p = prev.get(c); path.unshift(p.edge); c = p.from; }
  console.log(`[Router] Path found with ${path.length} segments.`);
  return { path, distance: dists.get(endKey) };
}

function findAccessibleWalkingRoute(startLL, endLL) {
  const segments = loadAccessibleSegments();
  const graph = buildGraph(segments);

  function getSnaps(pLL) {
    const candidates = [];
    for (const e of graph.allEdges) {
      const projected = projectPointOnSegment(pLL, e.a, e.b);
      const d = haversineDistance(pLL, projected);
      if (d < 50.0) candidates.push({ projected, d, edge: e });
    }
    return candidates.sort((a, b) => a.d - b.d).slice(0, 5);
  }

  console.log(`[Router] Finding route between ${toLatLon(startLL)} and ${toLatLon(endLL)}`);

  let sSnaps = getSnaps(startLL);
  let eSnaps = getSnaps(endLL);

  console.log(`[Router] Start snaps: ${sSnaps.length}, End snaps: ${eSnaps.length}`);

  // Last Resort: If no snaps found, find nearest node in continent
  if (!sSnaps.length) {
    const nearest = findNearestNodesGrid(startLL, graph.spatialGrid, graph.gridSize, 1, k => graph.largestComponent.has(k));
    if (nearest.length) sSnaps = [{ projected: nearest[0].pos, d: nearest[0].distance, edge: { aKey: nearest[0].key, bKey: nearest[0].key, metadata: { score: 1, props: {}, path: [nearest[0].pos, nearest[0].pos] }, weight: 0.1, distance: 0.1 } }];
  }
  if (!eSnaps.length) {
    const nearest = findNearestNodesGrid(endLL, graph.spatialGrid, graph.gridSize, 1, k => graph.largestComponent.has(k));
    if (nearest.length) eSnaps = [{ projected: nearest[0].pos, d: nearest[0].distance, edge: { aKey: nearest[0].key, bKey: nearest[0].key, metadata: { score: 1, props: {}, path: [nearest[0].pos, nearest[0].pos] }, weight: 0.1, distance: 0.1 } }];
  }

  if (!sSnaps.length || !eSnaps.length) {
    console.log('[Router] Failed to find snaps');
    return { success: false, error: 'no_snapping_nodes_found' };
  }

  const localAdj = new Map(graph.adj);
  function injectVNode(pLL, snaps, prefix) {
    const vKey = `${prefix}-vnode-${Math.random()}`;
    localAdj.set(vKey, []);

    // Track which nodes we've already copied in this request scope
    const modifiedNodes = new Set();

    snaps.forEach(s => {
      const d1 = haversineDistance(s.projected, s.edge.a || s.edge.aKey);
      const d2 = haversineDistance(s.projected, s.edge.b || s.edge.bKey);
      const sCore = s.edge.meta?.score || s.edge.metadata?.score || 0.7;
      const sProps = s.edge.meta?.props || s.edge.metadata?.props || {};
      const p = (s.edge.weight / s.edge.distance) || 1.0;

      const metaA = { id: 'v-seg', score: sCore, props: sProps, path: [s.projected, s.edge.a || s.projected] };
      const metaB = { id: 'v-seg', score: sCore, props: sProps, path: [s.projected, s.edge.b || s.projected] };

      // Add edges from VNode to Graph
      localAdj.get(vKey).push({ to: s.edge.aKey, metadata: { ...metaA, weight: d1 * p, distance: d1 } });
      localAdj.get(vKey).push({ to: s.edge.bKey, metadata: { ...metaB, weight: d2 * p, distance: d2 } });

      // Add edges from Graph to VNode (Copy-on-write)
      if (!localAdj.has(s.edge.aKey)) localAdj.set(s.edge.aKey, []);
      else if (!modifiedNodes.has(s.edge.aKey)) {
        // First modification to this node in this request scope: copy the array
        localAdj.set(s.edge.aKey, [...localAdj.get(s.edge.aKey)]);
        modifiedNodes.add(s.edge.aKey);
      }
      localAdj.get(s.edge.aKey).push({ to: vKey, metadata: { ...metaA, weight: d1 * p, distance: d1 } });

      if (!localAdj.has(s.edge.bKey)) localAdj.set(s.edge.bKey, []);
      else if (!modifiedNodes.has(s.edge.bKey)) {
        localAdj.set(s.edge.bKey, [...localAdj.get(s.edge.bKey)]);
        modifiedNodes.add(s.edge.bKey);
      }
      localAdj.get(s.edge.bKey).push({ to: vKey, metadata: { ...metaB, weight: d2 * p, distance: d2 } });
    });
    return vKey;
  }

  const startV = injectVNode(startLL, sSnaps, 'start');
  const endV = injectVNode(endLL, eSnaps, 'end');

  console.log(`[Router] Starting Dijkstra from ${startV} to ${endV}`);
  let result = dijkstra(localAdj, startV, endV);
  console.log(`[Router] Dijkstra finished. Found path: ${!!result}`);

  if (!result) {
    console.log('[Router] Path not found. Attempting fallback snap to largest component...');
    const getMetaSnaps = (latLon) => {
      const nearest = findNearestNodesGrid(latLon, graph.spatialGrid, graph.gridSize, 1, k => graph.largestComponent.has(k));
      if (nearest.length > 0) {
        const n = nearest[0];
        return [{
          projected: n.pos,
          d: n.distance,
          edge: {
            aKey: n.key,
            bKey: n.key,
            metadata: { score: 1, props: { fallback: true }, path: [n.pos, n.pos] },
            weight: 0.1,
            distance: 0.1
          }
        }];
      }
      return [];
    };

    const sSnapsFallback = getMetaSnaps(startLL);
    const eSnapsFallback = getMetaSnaps(endLL);

    if (sSnapsFallback.length && eSnapsFallback.length) {
      console.log(`[Router] Fallback snaps found. Retrying...`);
      const startV2 = injectVNode(startLL, sSnapsFallback, 'start-fallback');
      const endV2 = injectVNode(endLL, eSnapsFallback, 'end-fallback');
      result = dijkstra(localAdj, startV2, endV2);
    }
  }

  if (!result) return { success: false, error: 'no_path_found' };

  const routeSegments = result.path.map(e => ({
    id: e.metadata.id,
    geometry: { type: 'LineString', coordinates: e.metadata.path.map(([lat, lon]) => [lon, lat]) },
    properties: { ...e.metadata.props, score: e.metadata.score, issues: e.metadata.issues || [] },
    lengthM: e.metadata.distance || 0
  }));

  const totalDistM = routeSegments.reduce((sum, s) => sum + s.lengthM, 0);
  const weightedScoreSum = routeSegments.reduce((sum, s) => sum + (s.properties.score * s.lengthM), 0);
  const avgScore = totalDistM > 0 ? weightedScoreSum / totalDistM : 1.0;

  return {
    success: true,
    distance_km: totalDistM / 1000,
    accessibility_percent: Math.round(avgScore * 100),
    segments: routeSegments.map(({ lengthM, ...rest }) => rest),
    metrics: { total_distance_m: totalDistM, accessibility_score: avgScore }
  };
}

function findNearestNodesGrid(latLon, grid, gridSize, count = 20, filter = null) {
  const [lat, lon] = latLon;
  const gx = Math.floor(lat * gridSize), gy = Math.floor(lon * gridSize);
  const candidates = [];
  for (let r = 0; r <= 8; r++) { // Expanded search for last-resort
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const points = grid.get(`${gx + dx},${gy + dy}`);
        if (!points) continue;
        for (const p of points) {
          if (filter && !filter(p.key)) continue;
          candidates.push({ ...p, distance: haversineDistance(latLon, p.pos) });
        }
      }
    }
    if (candidates.length >= count) break;
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, count);
}

module.exports = { findAccessibleWalkingRoute, buildGraph, loadAccessibleSegments };
