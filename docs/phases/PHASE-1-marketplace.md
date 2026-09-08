# Phase 1 — Geofenced Marketplace

- **Version:** v0.2.0
- **Date:** 2026-09-08
- **Status:** Complete

## Objective

Turn the single hardcoded lot into a live multi-farmer marketplace and implement the pitch's step 2 — "FarmIt AI Agent scans a 100 km geofence for registered rice farmers" — plus farmer onboarding into that marketplace, while preserving the existing design system and the Phase 0 pricing guarantees.

## What was implemented

**Shared packages**
- `packages/domain` — `FarmLot` gains `latitude`/`longitude`; new `GeofenceLot` (lot + `distanceKm` + `withinGeofence`) and `ConsumerLocation` types.
- `packages/pricing` — haversine `distanceKm()`, `filterLotsWithinGeofence()` (nearest-first sort, `GEOFENCE_RADIUS_KM = 100`) (ADR-0004).
- `packages/validation` — `assertCoordinates()`; named `MSP_FLOOR_PER_KG` / `MIN_PADDY_KG_FOR_20_RICE` constants (ADR-0005).
- `packages/translations` — marketplace copy (en/kn); `packages/api-client` — `fetchNearbyLots()`, `createLot()`.

**Server (`apps/web`)**
- `lib/catalog.ts` — seeded 14-lot catalog across Tumkur, Ramanagara and Bengaluru Rural with approximate village coordinates; Sira/Pavagada/Tiptur seeded outside the ring on purpose (ADR-0003).
- `GET /api/lots?lat&lng` — geofence scan → `{ origin, radiusKm, lots, outsideCount }`; defaults to the Jayanagar hub.
- `POST /api/lots` — farmer lot listing, validated server-side (MSP floor, minimum quantity, coordinates).
- `POST /api/quote` — hardened: lot resolved server-side by `lotId`; client payout fields ignored; unknown lot → 404 (ADR-0002).

**UI (`apps/web`)**
- Consumer: "Nearby farmers · within 100 km" card grid with distance badges, quantity, ₹/kg floor, quality notes; hidden-lot food-miles note; per-farm snapshot binding with smart empty states; delivery timeline shows the selected farm's relay distance.
- Operator: per-lot pricing dropdown; publishes snapshots bound to `lotId`.
- Farmer: lot onboarding form with village picker (coordinates auto-filled) → server catalog → instant marketplace visibility.
- `globals.css`: new `.market-grid` / `.lot-card` / `.distance-badge` / `.market-bar` classes appended in a Phase-scoped section; legacy rules untouched.

## Why

- The pitch's middleman-bypass claim is only credible if the marketplace is visibly multi-farmer and the sourcing ring is enforced server-side — hence the catalog + geofence pair (ADR-0003, ADR-0004).
- Harden the quote API *before* adding more consumers of it: spoofable payouts would undermine every later feature (ADR-0002).
- Demo-local stores kept so judging/onboarding needs zero setup; the production swap is pre-documented, not pre-built (ADR-0003).

## Evidence

All results from the live production build (`next build` clean, `next start`, 2026-09-08):

| # | Test | Result |
|---|---|---|
| 1 | `pnpm typecheck` + `pnpm build` | ✅ clean; 8/8 pages generated |
| 2 | Geofence scan (Jayanagar origin) | ✅ 14 lots → 11 in-ring, 3 outside; nearest-first: Prakash 28.2 km → Basavaraj 90.6 km |
| 3 | `POST /api/lots` valid lot | ✅ 201; visible in next scan at 60.8 km, position 8 nearest |
| 4 | Below-MSP floor (₹18/kg) | ✅ 400 "Floor payout must be at least the common-paddy MSP of ₹24.41/kg." |
| 5 | Invalid coordinates (lat 999) | ✅ 400 "Latitude must be a number between -90 and 90." |
| 6 | 10 kg lot | ✅ 400 "needs at least 29.85 kg of paddy at 67% yield." |
| 7 | Quote, Shivanna lot, default inputs | ✅ 29.85 kg paddy @ ₹24.41 → payout ₹728.64, total ₹1,204.32, expires +48 h |
| 8 | Quote, Prakash lot | ✅ ₹1,208.71 — snapshots independently bound per lot |
| 9 | Unknown `lotId` | ✅ 404 "That lot is not in the marketplace catalog." |
| 10 | Spoof attempt (client sends ₹99/kg floor) | ✅ ignored — payout stayed ₹728.64 (server catalog is source of truth) |
| 11 | Order reserve → advance ×3 | ✅ 201; `reserved → milling → in_transit → delivered` all 200 |

## Known gaps & limitations

- Catalog and orders are in-memory; farmer-listed lots reset on server restart (ADR-0003; production path in `DEPLOYMENT.md`).
- No auth — the demo session is localStorage; Supabase schema/RLS exist but are unwired (Phase 4).
- Distances are haversine over village centroids, labelled illustrative (ADR-0004).
- Platform-fee model (flat ₹35 + 5% tax) does not yet match the deck's 10%-fee economics (₹946 slide); open decision in `ROADMAP.md`.
- FPO grouping, logistics, forecasting, escrow: not in scope for this phase (see matrix in `ROADMAP.md`).

## What this unblocks

- **Phase 2** (AI forecasting + route optimization) needs exactly this: a many-lot, distance-annotated catalog to aggregate orders over.
- **Phase 3** (escrow split) needs per-lot snapshots with itemized components — already produced.
- The UI grid is the natural anchor for FPO grouping and demand-forecast badges.

## Contributor notes

Start with `apps/web/lib/catalog.ts` (data), `packages/pricing` (`filterLotsWithinGeofence`), then the API routes in `apps/web/app/api/`. The design system notes in `CONTRIBUTING.md` apply to all UI changes; new CSS belongs in the Phase 1 section of `globals.css` unless the task is a redesign.