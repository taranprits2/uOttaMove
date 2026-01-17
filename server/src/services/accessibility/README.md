# Accessibility Data Service

Goal: produce a unified dataset that flags wheelchair-accessible segments in Toronto by merging OpenSidewalks-derived sidewalk data with venue-level accessibility signals from Wheelmap.org and AccessNow.

## Responsibilities

- Fetch/export OpenSidewalks sidewalk graphs for the Toronto bounding box (GeoJSON with `footway`, `kerb`, `incline`, etc.).
- Normalize attributes into a segment schema that the routing engine understands (e.g., `is_wheelchair_passable`, `curb_cut`, `surface`, `slope_grade`).
- Enrich segments with nearby venue accessibility ratings (Wheelmap, AccessNow) to improve confidence, storing provenance and timestamps.
- Persist the unified dataset (start with JSON/SQLite; upgrade to Postgres/PostGIS if time allows).
- Expose query helpers for the routing engine (`getAccessibleSegments(bounds)`, `getSegmentById(id)`).

## Suggested Next Steps

- [ ] Download/clone OpenSidewalks Toronto extract (via Overpass or GeoPandas script) and store raw files in `/data/raw/opensidewalks/`.
- [ ] Implement an ETL script `scripts/import_accessibility.js` that:
  1. Loads OpenSidewalks GeoJSON.
  2. Computes accessibility flags (curbs lowered, slope <= threshold, surface != cobblestone).
  3. Exports normalized segments into `/data/processed/segments.json` or a SQLite table.
- [ ] Integrate Wheelmap / AccessNow APIs (or CSV exports) to attach venue scores to nearby segments.
- [ ] Add caching + rate limiting for third-party API calls; follow each provider’s usage terms.
- [ ] Document the resulting schema in `schema.md` so the routing team knows what to expect.

### Running the OpenSidewalks Extract

```bash
cd back_end
npm run fetch:opensidewalks
```

This saves a GeoJSON file to `data/raw/opensidewalks/toronto_sidewalks.geojson` using a downtown Toronto bounding box by default. Update `TORONTO_BBOX` or `OUTPUT_PATH` environment variables if you need different regions or filenames.

### Scoring Segments for Wheelchair Accessibility

```bash
cd back_end
npm run process:accessibility
```

This loads the raw GeoJSON, computes a heuristic accessibility score for each segment, and writes `data/processed/accessible_segments.json`. The `aggregator.js` module currently uses OSM tags (`wheelchair`, `kerb`, `surface`, `smoothness`, `incline`, `width`) to determine:

- `attributes.accessibility_score` (0–1)
- `attributes.is_wheelchair_passable` (boolean thresholded at ≥0.6)
- `attributes.confidence` (`low`, `medium`, `high`)
- `attributes.issues` (array of flags such as `kerb_high`, `surface_gravel`)

Wheelmap/AccessNow integration is stubbed; once available, venue scores can be merged to boost confidence values.

## Collaboration Tips

- Share fixture datasets (`/data/fixtures/accessible_segments.sample.json`) so the routing engine can develop without running the whole ETL.
- Define confidence scoring (e.g., `confidence: high | medium | low`) so the router can downgrade uncertain paths.
- Keep all provider credentials in `.env` (never in source control); expose runtime configuration via `config/accessibility.js`.
