# FarmIt v1 · Farmer-to-Consumer Marketplace

FarmIt is an Android-ready Next.js prototype of a geofenced farmer-to-consumer marketplace: farmers list Sona Masuri paddy lots, and consumers inside a 100 km sourcing ring around Jaynagar, Bengaluru buy one transparent 20 kg weekly order from the nearest farms. Built for SIH 2026 problem statement 26033.

## Run locally

```bash
corepack pnpm install
corepack pnpm dev
```

Open `http://localhost:3000`. The prototype uses a seeded demo session so the complete farmer → operator → consumer path can be exercised without credentials or a remote Supabase project. Switch roles from **View as**. The operator generates the server-owned quote snapshot per farm lot; the consumer can then reserve or decline it.

The production build and typecheck can be run with `corepack pnpm build` and `corepack pnpm typecheck`.

## Documentation

| Doc | Read it for |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, flows, pricing model, demo↔production boundary |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase plan and PS-26033 requirements matrix |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Pilot/production environments, Supabase wiring, scaling notes |
| [`docs/phases/`](docs/phases) | Per-phase logs: what was implemented, why, test evidence, gaps |
| [`docs/decisions/`](docs/decisions) | Architecture decision records (ADRs) |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup, conventions, documentation contract, PR checklist |

## Workspace shape

- `apps/web`: Next.js PWA shell, demo workflows, route handlers, and the seeded lot catalog (`lib/catalog.ts`)
- `apps/web/lib/catalog.ts`: multi-farmer lot catalog (in-memory; Supabase replaces it at pilot)
- `packages/domain`: shared records and role/status contracts
- `packages/pricing`: server-side yield conversion, rupee rounding, quote calculation, and 100 km haversine geofence
- `packages/validation`: MSP floor payout, minimum-lot, and coordinate guards
- `packages/translations`: English/Kannada UI copy
- `packages/api-client`: typed fetch helpers for the marketplace endpoints
- `supabase/migrations`: PostgreSQL tables and row-level policies for the real auth-backed environment

The current API route handlers are intentionally demo-local. Before a pilot, replace the seeded lot catalog and in-memory order behavior with Supabase queries and email/password sessions (see `docs/DEPLOYMENT.md`). The quote snapshot should remain immutable after publication.

## Marketplace API

- `GET /api/lots?lat=…&lng=…` — server-side geofence scan. Returns every catalog lot annotated with `distanceKm` and `withinGeofence` (100 km radius, nearest first) plus `outsideCount` for lots the food-miles guardrail hides. Without query params it scans from the Jayanagar hub.
- `POST /api/lots` — lists a new farmer lot. Validates the MSP floor (₹24.41/kg), the 29.85 kg minimum (20 kg rice at 67% yield), and the coordinates server-side.
- `POST /api/quote` — publishes a fixed snapshot for a `lotId`. The lot is resolved from the server-side catalog, so clients cannot spoof farmer payouts; unknown lots return 404.

## Pricing guardrails

The demo uses a 67% documented milling yield and a ₹24.41/kg 2026–27 common-paddy MSP reference. A 20 kg rice offer therefore requires 29.85 kg of paddy before milling, packaging, logistics, platform charge, or tax. All visible seed figures are labelled illustrative demo data in the UI.

## Pricing guardrails

The demo uses a 67% documented milling yield and a ₹24.41/kg 2026–27 common-paddy MSP reference. A 20 kg rice offer therefore requires 29.85 kg of paddy before milling, packaging, logistics, platform charge, or tax. All visible seed figures are labelled illustrative demo data in the UI.