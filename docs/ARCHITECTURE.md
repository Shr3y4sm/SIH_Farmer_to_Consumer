# Architecture

FarmIt is a farmer-to-consumer marketplace for staple grains. This document describes the system as of **v0.2.0 (Phase 1)** and, critically, the boundary between the zero-setup demo and the production (Supabase-backed) environment.

## System overview

```
                 ┌────────────────────────── Browser (PWA) ──────────────────────────┐
                 │  apps/web/app/page.tsx — role-switched demo shell                  │
                 │  consumer: farm grid + offer receipt | operator: cost inputs       │
                 │  farmer: lot onboarding | state persisted in localStorage          │
                 └──────────────┬───────────────────────────────┬─────────────────────┘
                                │ fetch (JSON)                  │
                 ┌──────────────▼───────────────┐ ┌─────────────▼───────────────┐
                 │ GET/POST /api/lots           │ │ POST /api/quote             │
                 │  geofence scan (haversine)   │ │  lot lookup by lotId        │
                 │  POST lists new farmer lots  │ │  calculateQuote() snapshot  │
                 └──────────────┬───────────────┘ └─────────────┬───────────────┘
                                │                               │
                 ┌──────────────▼───────────────────────────────▼───────────────┐
                 │ apps/web/lib/catalog.ts — in-memory lot catalog (14 seeds)   │
                 │   ◇ DEMO ONLY — replaced by Supabase farm_lots at pilot      │
                 └───────────────────────────────────────────────────────────────┘
                 ┌───────────────────────────────────────────────────────────────┐
                 │ POST/PATCH /api/orders — demo order lifecycle (reserved →     │
                 │ milling → in_transit → delivered); in-memory/localStorage     │
                 └───────────────────────────────────────────────────────────────┘
```

## Monorepo layering

```
validation ─┐
domain ◄────┤ pricing          (pure server logic; no React, no I/O)
            └ api-client       (typed fetch helpers)
apps/web ─── imports all of the above + owns routes, catalog, UI
```

Rules (enforced by convention, see `CONTRIBUTING.md`): `domain` and `validation` depend on nothing; `pricing` depends only on `domain`; packages never import app code; shared record types exist **only** in `packages/domain`.

## Key flows

### 1. Geofence marketplace scan (`GET /api/lots`)
1. Origin defaults to the Jayanagar hub (`CONSUMER_HUBS[0]`); `?lat&lng` overrides it after `assertCoordinates()`.
2. `filterLotsWithinGeofence()` (in `@farmit/pricing`) computes great-circle (haversine) distance from origin to every catalog lot, flags `withinGeofence` at ≤ `GEOFENCE_RADIUS_KM` (100 km), sorts nearest-first.
3. Response: `{ origin, radiusKm, lots: GeofenceLot[], outsideCount }`. Out-of-ring lots are returned but flagged — the **UI** hides them behind an explicit "food-miles guardrail" note, keeping the data auditable.

### 2. Quote snapshot (`POST /api/quote`)
1. Client sends `QuoteInput` (partner cost inputs) + `lotId` **only**.
2. The route resolves the lot from the server-side catalog (ADR-0002). Client-supplied payout fields are ignored — spoof attempts are provably ineffective.
3. `calculateQuote()` applies: 20 kg rice ÷ 67% yield → 29.85 kg paddy; farmer payout = paddy kg × max(lot floor, ₹24.41 MSP); adds milling, packaging/QA, farm→mill, line-haul, last-mile, platform charge, tax; rounds in rupees; stamps `createdAt`/`expiresAt` (snapshot valid 48 h by default) and a fixed weekly run window.
4. The snapshot is **immutable after publication** — the consumer receipt renders exactly what the operator published.

### 3. Order lifecycle (`POST/PATCH /api/orders`, demo-local)
`reserved → milling → in_transit → delivered`. Reservations create no payment; delivery advance is simulated. The escrow split + QR verification from the pitch are Phase 3 (see `docs/ROADMAP.md`).

## Pricing model (single source: `packages/pricing`)

| Concept | Value | Enforced |
|---|---|---|
| Documented milling yield | 67% (20 kg rice ← 29.85 kg paddy) | `DEMO_YIELD_RATE` |
| Farmer floor | max(lot floor, ₹24.41 MSP) per kg paddy | `assertFloorPayout` + `Math.max` in engine |
| Minimum lot | ≥ 29.85 kg paddy (one 20 kg rice offer) | `assertAvailableQuantity` |
| Snapshot expiry | operator-configured hours (default 48) | `QuoteSnapshot.expiresAt` |

The consumer receipt itemises every component — this is the product's core trust feature; treat any change to it as API-breaking.

## Demo ↔ production boundary

| Concern | Demo (now) | Pilot (target) | Migration notes |
|---|---|---|---|
| Lot catalog | `lib/catalog.ts` in-memory array | Supabase `farm_lots` + PostGIS geography | ADR-0003, ADR-0004 |
| Auth/sessions | localStorage demo session | Supabase email/password + `profiles.role` | schema + RLS already in `001_farmit_core.sql` |
| Orders | in-memory demo handler | Supabase `orders` keyed to `quote_snapshots` | status enum already in schema |
| Geofence | haversine in JS over all lots | PostGIS `ST_DWithin` with spatial index | required beyond ~10k lots |
| Payments/escrow | disabled | payment-gateway escrow + split settlement | Phase 3, needs partner decision |
| Quote store | returned to client only | `quote_snapshots` table (immutable JSONB) | schema ready |

Anything replacing demo-local behaviour must preserve two invariants: **the quote snapshot stays immutable**, and **validation runs server-side**.