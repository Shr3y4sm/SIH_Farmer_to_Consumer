# Phase 2 — AI: Demand Forecasting & Route Optimization

- **Version:** v0.3.0
- **Date:** 2026-09-08
- **Status:** Complete

## Objective

Implement the two PS-26033-mandated AI capabilities that were still absent after Phase 1: **demand forecasting** and **route optimization**, realised through the pitch deck's FPO-hub two-relay logistics model, with explainability as a hard requirement (ADR-0006, ADR-0007). Platform-fee model change deliberately deferred to Phase 3 (per the roadmap's open decisions).

## What was implemented

**New packages**
- `packages/forecast` — `forecastDemand()`: weighted moving average + damped least-squares trend + 4-week seasonal index; MAPE-sized confidence band; pure, deterministic, zero deps.
- `packages/logistics` — `planRelayRoutes()`: nearest-hub assignment → capacity-batched pickup tours (nearest-neighbour + 2-opt) → one bulk line-haul per hub; food-miles-saved metric vs one-truck-per-farmer baseline. Depends on `@farmit/pricing` (haversine reuse).

**Server (`apps/web`)**
- `lib/demand-history.ts` — deterministic 16-week seeded demand history (fixed anchor Saturday 2026-09-12, PRNG seed 42), FPO hub coordinates (Tumkur, Ramanagara, Nelamangala), Jayanagar dark store, seed pickup loads.
- `GET /api/forecast?horizon=1..4` — history + forecast + supply check (in-ring paddy ÷ 29.85 kg/bag) + method metadata.
- `POST /api/routes` — relay plan for open orders (defaults: 8 nearest in-ring lots with deterministic loads); accepts an explicit `orders[]` override.

**UI (`apps/web`)**
- Operator: "Demand outlook" card — SVG sparkline (solid history / dashed forecast, hand-rolled, no chart lib), next-week point + range, trend, MAPE, 4-week total, supply pill, link to logistics desk.
- Operator: new sidebar "Logistics" view — summary tiles (saved %, consolidated km, baseline km, saved km) and per-route cards with ordered stop sequences (hub → farms → hub → line-haul).
- Consumer: demand-note nudge under the marketplace grid — amber "reserve early" when next-week forecast exceeds nearby supply, green "supply is comfortable" otherwise.
- Sidebar nav gains a Logistics item for the operator role only.

## Why

- Both features are named in the problem statement and were the largest judge-visible gaps after Phase 1.
- Explainable statistics over black-box ML: with 16 weeks of synthetic data, any trained model would be theatre; a method you can write on a whiteboard survives judge scrutiny and is honest about its data (ADR-0006).
- The routing algorithm mirrors the deck's own mitigation (FPO hub consolidation) so the demo, deck and code tell one story (ADR-0007).

## Evidence

Live production build (`next build` clean, 10/10 pages; `next start`, 2026-09-08):

| # | Test | Result |
|---|---|---|
| 1 | `pnpm typecheck` + `pnpm build` | ✅ clean; 10/10 pages (2 new API routes) |
| 2 | `GET /api/forecast?horizon=4` | ✅ 16-week history; forecast 19 Sept ~30.9 (28.4–33.4), 26 Sept ~33.8, 03 Oct ~30.6, 10 Oct ~28.9 bags; supply 249.9 bags; trend +0.44 bags/wk; MAPE 6.8% |
| 3 | Horizon clamping (`?horizon=99`) | ✅ clamped to 4 |
| 4 | Determinism (two identical forecast calls) | ✅ byte-identical output |
| 5 | `POST /api/routes` default batch | ✅ 8 pickups → 3 hub routes; **consolidated 381.7 km vs 758.4 km baseline → 376.7 km saved (49.7%)** |
| 6 | Route sanity | ✅ Nelamangala hub: Prakash→Chikkamma→Venkatesh→Muniraju (200 kg, 128.4 km pickup + 28.2 km line-haul); Ramanagara: Sowbhagya→Thimmaraju; Tumkur: Manjula→Lakshmamma — farms correctly grouped by nearest hub |
| 7 | `POST /api/routes` with `orders: []` | ✅ 400 "At least one open order is required…" |
| 8 | Phase 1 regression | ✅ geofence scan unchanged (14 lots / 11 in-ring); quote unchanged (₹1,204.32 / ₹728.64 payout) |

## Known gaps & limitations

- Demand history is synthetic (seeded); at pilot it must come from real `orders` history (schema ready, `DEPLOYMENT.md`).
- `forecastDemand` throws below two full seasonal cycles — real deployments need a cold-start policy (documented as `TODO(phase-4)` candidate).
- Routing distances are haversine (straight-line), not road-network distances; swap-in point documented in ADR-0007.
- FPO grouping is derived (nearest-hub assignment), not an operator-managed entity — full FPO management is Phase 4.
- Forecast/route responses are recomputed per request; cache-friendly if pilot traffic demands it.

## What this unblocks

- **Phase 3** (escrow): delivery confirmation can now reference a concrete relay route; the QR handshake lands at the dark store stop.
- Judge demo narrative: forecast (why stock) → marketplace (who sells) → routing (how it moves) → receipt (what it costs).

## Contributor notes

`packages/forecast/src/index.ts` and `packages/logistics/src/index.ts` are self-contained and unit-testable (pure functions). The demo data seam is `apps/web/lib/demand-history.ts` — replace its exports with real data to go live. UI additions live in the Phase 2 CSS section of `globals.css`.