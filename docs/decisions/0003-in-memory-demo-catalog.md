# ADR-0003: in-memory demo catalog with a defined Supabase swap

- **Status:** Accepted (2026-09-08, Phase 1)
- **Context:** The demo must run with zero external services (hackathon judging, contributor onboarding), while the pitch promises a live multi-farmer marketplace with farmers joining at runtime.
- **Decision:** `apps/web/lib/catalog.ts` holds a seeded 14-lot catalog in a process-local array shared through `globalThis`; `GET /api/lots` reads it, `POST /api/lots` appends (validated). The runtime sharing keeps farmer-listed lots visible across Next development hot reloads, but they are still lost on a full server restart — accepted for the demo. The swap to Supabase `farm_lots` is documented step-by-step in `DEPLOYMENT.md` (Environment 2).
- **Consequences:** Instant demo, no DB dependency in the geofence path. Not horizontally scalable (each instance has its own array) — the single deliberate reason the demo is not "production-ready", tracked as Phase 4.
- **Alternatives rejected:** SQLite/file store (persistence without value for judging; adds setup); wiring Supabase now (violates the zero-setup demo requirement and blocks offline development).
