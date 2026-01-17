# Routing Engine

Calculates accessibility-aware routes using enriched map data.

## Responsibilities

- Ingest base graph data + accessibility layers from `map_data` and `accessibility`.
- Model constraints for different mobility needs (wheelchair, low-vision, etc.).
- Run weighted shortest-path algorithms (Dijkstra/A* variants) that respect accessibility tags.
- Expose route computation through internal APIs (e.g., `findAccessibleWalkingRoute`, `planAccessibleTrip`).

## Suggested Next Steps

- [ ] Harden the graph builder with spatial indexing for faster nearest-node lookups.
- [ ] Integrate Wheelmap / AccessNow venue scores to tweak penalties in `walking_router.js`.
- [ ] Introduce GTFS + real-time data to power accessible transit routing in `transit_router.js`.

## Collaboration Tips

- Keep business logic decoupled from Google-specific classes; consume the normalized DTOs the map team emits.
- Provide contract tests or JSON fixtures that describe the inputs/outputs so both teams stay aligned.

## Modules

- `walking_router.js` – loads `data/processed/accessible_segments.json`, builds an accessibility-weighted graph, and runs Dijkstra to return wheelchair-friendly walking routes.
- `transit_router.js` – stub entry point for multi-modal trips; currently falls back to walking until GTFS integration is wired up.
- `../../utils/geo.js` – shared Haversine distance helper.

### Usage Example

```js
const { findAccessibleWalkingRoute } = require('./walking_router');

const result = findAccessibleWalkingRoute(
  [43.654, -79.383], // start (lat, lon)
  [43.665, -79.394], // end (lat, lon)
  { allowLimitedSegments: true },
);

if (result.success) {
  console.log(result.metrics.total_distance_m);
  console.log(result.path); // array of [lat, lon] coordinates
}
```
