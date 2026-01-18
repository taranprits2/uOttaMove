# Map Data Layer

Owns integration with external mapping providers (e.g., Google Maps Platform).

## Responsibilities

- Manage API keys, rate limiting, and retries.
- Wrap Places, Directions, Elevation, or Accessibility endpoints.
- Normalize provider responses into internal data transfer objects for downstream services.
- Cache geocoding and map tile metadata so the routing engine can stay fast.

## Suggested Next Steps

- [ ] Create a lightweight client module (e.g., `map_client.js`) that exposes `geocode`, `fetchBaseGraph`, and `lookupPlace`.
- [ ] Add configuration support for API keys via environment variables.
- [ ] Stub unit tests that mock Google Maps responses.

## Collaboration Tips

- Keep provider-specific logic here; expose clean, provider-agnostic interfaces.
- Surface all data needed by the routing engine as plain JavaScript objects (use JSDoc for typing if helpful) so hand-off stays seamless.
