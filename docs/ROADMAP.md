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
| Escrow payout split on delivery (deck step 4) | 3 | ✅ Simulated escrow lifecycle; split released on QR handshake, verified balanced |
| QR-code delivery handshake | 3 | ✅ Server-rendered SVG QR + code-verified release |
| Bulk buyers (B2B channel) | 4 | ❌ Moved from Phase 3 to keep it focused |
| Real auth, Supabase wiring | 4 | 🚧 Schema + RLS written, not wired |
| Live audit ledger ("see who is paid") | 3 | ✅ Ledger rows with escrow status, visible from reservation to release |

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

### Phase 3 — Trust: escrow & delivery verification (v0.4.0) ✅
1. ✅ **Escrow ledger** — held → in-transit → released, split computed from the immutable server snapshot (ADR-0009).
2. ✅ **QR handshake** — server-rendered SVG QR, code-verified release; wrong code and double release fail closed.
3. ✅ **Live audit ledger** — consumer-facing split rows (farmer / miller / transporters / platform / GST) with status.
4. ✅ **10% platform-fee model** — deck-aligned engine economics (ADR-0008); demo total ₹999.50 vs slide's ₹946 (delta = MSP-floored payout).
5. → Bulk-buyer (B2B) tier moved to Phase 4. Log: [`PHASE-3-escrow-qr-audit.md`](phases/PHASE-3-escrow-qr-audit.md)

### Phase 4 — Production hardening
1. Wire routes to Supabase (auth, farm_lots, quote_snapshots, orders); replace demo-local stores.
2. PostGIS geofence (`ST_DWithin`) with spatial index (ADR-0004 migration path).
3. Bulk-buyer tier (FPO/retailer carts), notifications, regional language expansion beyond en/kn.
4. Observability, rate limiting, and load profile for pilot traffic; real payment partner for escrow.

## Decision backlog (open questions)

- Platform-fee model: flat ₹/order (v1) vs deck's 10% of farmer payout — ✅ **resolved in Phase 3**: 10% of cost of goods + logistics (ADR-0008).
- Escrow partner: payment-gateway split settlement vs UPI-centric flow; compliance owner unclear — the demo's escrow record shape (ADR-0009) is the integration contract.
- Mapping provider for consumer-facing distance/route visuals (demo uses pure numbers, no tiles).
- Forecast cold-start policy for real deployments with < 8 weeks of history (`forecastDemand` currently requires two full seasonal cycles).