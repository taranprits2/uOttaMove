# Back-End Overview

Two primary workstreams so teammates can build in parallel:

1. **`src/services/map_data/`** – integrates with OpenStreetMap (or other providers), handles authentication, pulls base map data, and emits normalized DTOs.
2. **`src/services/accessibility/`** – ingests OpenSidewalks + Wheelmap/AccessNow data to build accessibility-aware segment datasets.
3. **`src/services/routing/`** – consumes normalized data, layers accessibility constraints, and returns optimal routes tailored to user profiles.

Supporting folders:

- **`src/routes/`** – Express routers grouped by feature (e.g., `places.routes.js`, `auth.routes.js`).
- **`src/controllers/`** – request/response handlers that orchestrate services.
- **`src/models/`** – database schema or data-access code once persistence is added.
- **`src/middleware/`** – auth, validation, or logging middleware.
- **`src/config/`** – environment/bootstrap logic (API keys, database clients).
- **`src/utils/`** – shared helpers.
- **`src/server.js`** – application entry point wiring everything together.

## Interaction Contract

- `map_data` services should expose provider-agnostic functions (e.g., `getGraph(areaBounds)`, `geocode(address)`) and keep raw API plumbing here.
- `routing` services consume those functions or their outputs via JSON/DB and focus on algorithmic routing without worrying about external API details.

Define shared data contracts early (e.g., a `Segment` JSON schema with accessibility attributes) and keep them in a `contracts/` module if helpful. This keeps the codebases decoupled while letting both be developed simultaneously. 

Consider setting up a small Express/Fastify gateway later that composes both services into public endpoints.

## API Endpoints

The Express server registers these JSON endpoints (see `src/routes/api.js`):

- `GET /api/map/search?query=...` – proxy to OpenStreetMap Nominatim search.
- `POST /api/routes/walking` – returns a wheelchair-aware walking route given `{ start: { lat, lon }, end: { lat, lon } }`.
- `POST /api/routes/transit` – placeholder for future multimodal routing (currently falls back to walking).

Run the server with `node src/server.js` and use `ALLOWED_ORIGIN` to restrict CORS if needed (`ALLOWED_ORIGIN=http://localhost:5173` during local dev).
