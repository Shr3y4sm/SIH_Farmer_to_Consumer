# ADR-0004: haversine geofence in application code (PostGIS at pilot)

- **Status:** Accepted (2026-09-08, Phase 1)
- **Context:** The pitch enforces a strictly 100 km sourcing ring. The demo must filter lots by distance without requiring PostGIS or any database.
- **Decision:** `distanceKm()` (haversine, great-circle, rounded to 0.1 km) and `filterLotsWithinGeofence()` live in `@farmit/pricing`, operating on plain `{latitude, longitude}`. Lots beyond the radius are returned flagged (`withinGeofence: false`) and hidden by the UI behind an explicit food-miles note — data stays auditable.
- **Consequences:** Works everywhere the demo runs; distances are approximate centroids (labelled illustrative). Scales acceptably to ~10k lots (full scan, no index). Beyond that, the pilot must enable PostGIS and use `ST_DWithin` with a GIST index — the migration is documented in `DEPLOYMENT.md` and is why coordinates are already first-class in `FarmLot`.
- **Alternatives rejected:** client-side distance math (server must own the geofence rule, same reasoning as ADR-0002); bounding-box prefilter (premature; kept as the cheap first step before `ST_DWithin` if needed).
