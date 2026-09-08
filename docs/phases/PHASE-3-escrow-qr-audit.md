# Phase 3 — Trust: Escrow, QR Handshake & the 10% Fee Model

- **Version:** v0.4.0
- **Date:** 2026-09-08
- **Status:** Complete

## Objective

Complete the pitch's 4-step system flow: simulated escrow holding the snapshot total, release via a real doorstep QR-code handshake, and a live audit ledger showing exactly who is paid. Also align the pricing engine with the deck's flat 10% platform-fee model — the decision deferred from Phase 2. Bulk buyers (B2B) moved to Phase 4 to keep this phase focused.

## What was implemented

**Pricing (fee model, ADR-0008)**
- `packages/pricing` — `PLATFORM_FEE_RATE = 0.1`; `platformCharge = 10% × (farmer payout + milling + packaging/QA + freight)`; GST remains an operator input (default 0, deck-aligned). `QuoteInput.platformCharge` removed (breaking API change, recorded in the changelog).
- Demo operator defaults retuned to deck-adjacent economics: milling ₹4/kg, freight ₹100 total, no packaging line, no GST.

**Escrow (ADR-0009)**
- `packages/domain` — `EscrowStatus`, `EscrowSplit`, `EscrowRecord` contracts.
- `apps/web/lib/snapshots.ts` — published snapshots now persist server-side (in-memory, mirrors the `quote_snapshots` table); escrow splits are computed **only** from them.
- `apps/web/lib/escrow.ts` — `held → in_transit → released` lifecycle: idempotent hold (planned split at hold time), dispatch generates a `FARMIT-XXXXXXXX` delivery code, release requires the code. Split rows: farmer / miller (milling+QA) / transporters (all freight legs) / platform / GST.
- `POST/GET /api/escrow` — hold, dispatch, release, and status lookup with fail-closed guards.
- `GET /api/escrow/qr?code=…` — server-rendered SVG QR (`qrcode` — the first new runtime dependency, confined to the app).

**UI**
- Consumer offer card: **audit ledger** box (all split rows + escrow status pill) visible from reservation through release; when in-transit, the **doorstep QR** and code appear with a "simulate courier scan" button; on release the ledger flips to "Released & paid".
- Operator desk: platform-charge field removed, GST field relabelled, guardrail text updated (10% fee + escrow rule).
- Receipt labels: "FarmIt fee · 10%"; GST row renders only when set.

## Evidence

Live production build (12/12 pages; `next start`, 2026-09-08):

| # | Test | Result |
|---|---|---|
| 1 | `pnpm typecheck` + `pnpm build` | ✅ clean; 12/12 pages (2 new API routes + QR) |
| 2 | Deck-aligned quote (Shivanna, defaults) | ✅ farmer ₹728.64 + mill ₹80 + freight ₹100 → fee ₹90.86 (10%) → **total ₹999.50** (deck slide: ₹946 — the ₹53 delta is the MSP-floored payout) |
| 3 | Escrow hold on unpublished snapshot | ✅ 404 fail-closed |
| 4 | Hold on published snapshot | ✅ `held`, total ₹999.50, planned split `{farmer: 728.64, miller: 80, transporters: 100, platform: 90.86, tax: 0}` |
| 5 | Dispatch | ✅ `in_transit`, code `FARMIT-E1677D53` |
| 6 | Release with wrong code | ✅ 400 "Delivery code mismatch — the QR handshake failed." |
| 7 | Release with correct code | ✅ `released`; **split sums to ₹999.50 exactly** |
| 8 | Double release | ✅ 400 fail-closed |
| 9 | QR endpoint | ✅ 200, `image/svg+xml`, valid `<svg>` |
| 10 | Phase 1–2 regressions | ✅ geofence 11 in-ring; forecast ~30.9 bags; routes 3 relays / 49.7% saved |

## Known gaps & limitations

- Escrow and snapshots are in-memory; both reset on server restart while the browser session persists — a release after a restart fails closed with a clear error (by design until Supabase wiring).
- The "courier scan" is simulated client-side (the demo presents its own code); real deployments verify from a separate scanner device.
- No real money movement — the record shape is the contract for a payment-gateway escrow/split partner (open decision in the roadmap).
- Bulk-buyer (B2B) tier deferred to Phase 4.

## What this unblocks

- The judge demo now walks the complete deck diagram: forecast → geofence marketplace → fixed snapshot → escrow hold → relay routes → QR handoff → split release.
- Phase 4's Supabase wiring has clean table mappings: `quote_snapshots` (already persisted server-side), `orders`, and an escrow ledger table with the same split rows.

## Contributor notes

`lib/escrow.ts` + `lib/snapshots.ts` are the demo/pilot seam — the ADR-0009 record shape must survive the Supabase migration. The fee model lives in one constant (`PLATFORM_FEE_RATE`); changing it updates every receipt, ledger and test number.