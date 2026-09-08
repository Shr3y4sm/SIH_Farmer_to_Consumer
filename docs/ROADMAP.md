# Roadmap

FarmIt is built in phases against **SIH 2026 problem statement 26033** ("Multiple intermediaries reduce farmers' earnings and increase consumer prices"). Each phase ends with a log in `docs/phases/` and a changelog entry.

## PS-26033 requirements matrix

| PS / deck requirement | Phase | Status |
|---|---|---|
| Connect farmers/FPOs directly with consumers | 1 | ✅ Multi-farmer catalog + consumer marketplace (FPO grouping pending) |
| Geofenced sourcing (deck: 100 km ring) | 1 | ✅ Server-enforced haversine geofence, hidden-lot guardrail |
| Transparent itemized pricing on every receipt | 0 | ✅ Quote snapshot + itemized breakdown |
| MSP floor protection for farmers | 0 | ✅ Server-side guard, spoof-proof |
| Farmer lot onboarding | 1 | ✅ Demo flow (auth-backed version in Phase 4) |
| Logistics support / relay routing | 2 | ✅ FPO-hub two-relay planner (NN + 2-opt), food-miles-saved metric, logistics desk UI |
| AI demand forecasting (explicit PS) | 2 | ✅ Explainable weekly forecast (WMA + trend + seasonal index) with supply check |
| Route optimization (explicit PS) | 2 | ✅ Consolidated relay routes; 49.7% food-miles saved on the demo batch |
| FPO grouping | 2 | 🚧 Nearest-hub assignment derived from coordinates; operator-managed FPO entity pending |
| Escrow payout split on delivery (deck step 4) | 3 | ❌ Payments disabled in v1 |
| QR-code delivery handshake | 3 | ❌ |
| Bulk buyers (B2B channel) | 3–4 | ❌ |
| Real auth, Supabase wiring | 4 | 🚧 Schema + RLS written, not wired |
| Live audit ledger ("see who is paid") | 3 | 🚧 Receipt exists; escrow ledger doesn't |

Status legend: ✅ implemented · 🚧 partial · ❌ not started

## Phases

### Phase 0 — Baseline prototype (v0.1.0) ✅
Monorepo, transparent quote engine (yield/MSP/snapshot immutability), three-role demo shell, Supabase schema + RLS. Log: [`PHASE-0-baseline.md`](phases/PHASE-0-baseline.md)

### Phase 1 — Geofenced marketplace (v0.2.0) ✅
Multi-farmer server-side catalog, 100 km geofence scan API, farmer lot onboarding, per-lot operator pricing, hardened server-owned quotes. Log: [`PHASE-1-marketplace.md`](phases/PHASE-1-marketplace.md)

### Phase 2 — AI: forecasting & routing (v0.3.0) ✅
1. ✅ **Demand forecasting** — explainable weekly model (weighted MA + damped trend + seasonal index) from deterministic demo history; supply-vs-demand nudge for consumers; ADR-0006.
2. ✅ **Route optimization** — FPO-hub two-relay plans (nearest-neighbour + 2-opt, capacity-batched) with food-miles-saved metrics and an operator logistics desk; ADR-0007.
3. 🚧 FPO/producer-group entity in the catalog (nearest-hub assignment shipped; operator-managed grouping in Phase 4). Log: [`PHASE-2-ai-forecasting-routing.md`](phases/PHASE-2-ai-forecasting-routing.md)

### Phase 3 — Trust: escrow & delivery verification
1. Simulated escrow ledger: on delivery confirmation, split the snapshot total into farmer / mill / transporter / platform entries.
2. QR handshake at doorstep (generate on dispatch, scan to confirm) triggering the split.
3. Live audit ledger view ("see exactly what the farmer, driver and miller are paid").
4. Align the platform-fee model with the deck's flat 10% transaction fee (open decision — currently flat ₹35 + 5% tax).

### Phase 4 — Production hardening
1. Wire routes to Supabase (auth, farm_lots, quote_snapshots, orders); replace demo-local stores.
2. PostGIS geofence (`ST_DWithin`) with spatial index (ADR-0004 migration path).
3. Bulk-buyer tier (FPO/retailer carts), notifications, regional language expansion beyond en/kn.
4. Observability, rate limiting, and load profile for pilot traffic; real payment partner for escrow.

## Decision backlog (open questions)

- Platform-fee model: flat ₹/order (v1) vs deck's 10% of farmer payout — **scheduled for Phase 3** (deferred from Phase 2 by decision, 2026-09-08).
- Escrow partner: payment-gateway split settlement vs UPI-centric flow; compliance owner unclear — needed for Phase 3 credibility.
- Mapping provider for consumer-facing distance/route visuals (demo uses pure numbers, no tiles).
- Forecast cold-start policy for real deployments with < 8 weeks of history (`forecastDemand` currently requires two full seasonal cycles).