# Changelog

All notable changes to FarmIt are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions are phase-based semver (`MAJOR.MINOR.PATCH` → pilot/phase.feature.fix). Every version links to its phase log in `docs/phases/`.

## [0.3.0] — 2026-09-08 — Phase 2: AI Demand Forecasting & Route Optimization

Phase log: [`docs/phases/PHASE-2-ai-forecasting-routing.md`](docs/phases/PHASE-2-ai-forecasting-routing.md)

### Added
- `@farmit/forecast` — explainable weekly demand forecasting: weighted moving average + damped linear trend + 4-week seasonal index, MAPE-sized confidence band; pure and deterministic (ADR-0006).
- `@farmit/logistics` — relay route planning: nearest-hub assignment, capacity-batched nearest-neighbour + 2-opt pickup tours, one bulk line-haul per FPO hub, food-miles-saved metric (ADR-0007).
- `GET /api/forecast?horizon=1..4` — demand history, forecast with bands, and geofenced supply check.
- `POST /api/routes` — consolidated relay plan for open orders (seeded demo batch by default).
- Deterministic 16-week demo demand history and FPO-hub/dark-store coordinates (`apps/web/lib/demand-history.ts`).
- Operator UI: "Demand outlook" sparkline card and a new "Logistics" desk view with per-relay stop sequences.
- Consumer UI: demand-vs-supply nudge under the marketplace grid ("reserve early" / "supply is comfortable").

### Deferred
- Platform-fee model alignment with the deck (10% flat) — moved to Phase 3 per the roadmap's open decisions.

## [0.2.0] — 2026-09-08 — Phase 1: Geofenced Marketplace

Phase log: [`docs/phases/PHASE-1-marketplace.md`](docs/phases/PHASE-1-marketplace.md)

### Added
- Server-side lot catalog (`apps/web/lib/catalog.ts`): 14 seeded Sona Masuri lots across Tumkur, Ramanagara and Bengaluru Rural with approximate village coordinates; lots outside the sourcing ring (Sira, Pavagada, Tiptur) included deliberately to demonstrate the geofence.
- `GET /api/lots?lat&lng` — 100 km geofence scan returning every lot annotated with `distanceKm` and `withinGeofence`, nearest-first, plus `outsideCount`.
- `POST /api/lots` — farmer lot listing with server-side validation (MSP floor, minimum paddy quantity, coordinate bounds).
- Haversine `distanceKm()` and `filterLotsWithinGeofence()` in `@farmit/pricing` (`GEOFENCE_RADIUS_KM = 100`).
- `assertCoordinates()` guard plus named constants (`MSP_FLOOR_PER_KG`, `MIN_PADDY_KG_FOR_20_RICE`) in `@farmit/validation`.
- Marketplace UI: consumer farm grid with distance badges and hidden-lot note, per-lot operator pricing dropdown, farmer lot-onboarding form with village picker.
- `@farmit/api-client`: `fetchNearbyLots()` and `createLot()` helpers; marketplace copy in English and Kannada.

### Changed
- **Breaking (API):** `POST /api/quote` now requires `lotId` and resolves the lot from the server-side catalog. The previous client-supplied `lot` payload is no longer accepted; unknown lots return 404.
- Farmer, operator and consumer panels reworked around lot selection; hero reframed from "one farmer" to a multi-farm marketplace.

### Security
- Server-owned pricing: client-supplied payout fields are ignored (verified by spoof test in the phase log).

## [0.1.0] — 2026-09-08 — Baseline prototype

Phase log: [`docs/phases/PHASE-0-baseline.md`](docs/phases/PHASE-0-baseline.md)

### Added
- pnpm monorepo: Next.js 15 PWA (`apps/web`) plus `domain`, `pricing`, `validation`, `translations` packages.
- Server-side quote engine: 67% documented milling yield, ₹24.41/kg MSP floor reference, immutable quote snapshots with expiry.
- Demo workflow (farmer → operator → consumer) with role switching and localStorage persistence.
- Supabase schema and row-level security policies for the future auth-backed environment (`supabase/migrations/001_farmit_core.sql`).
