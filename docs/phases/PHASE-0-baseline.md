# Phase 0 — Baseline prototype

- **Version:** v0.1.0
- **Date:** 2026-09-08
- **Status:** Complete (retroactive log, written at Phase 1 close)

## Objective

Prove the pitch's core economics claim with a working vertical slice: one farmer lot → operator-published transparent quote → consumer reservation, with every rupee on the receipt accounted for and the farmer's floor protected.

## What was implemented

- **Monorepo skeleton** — pnpm workspace; Next.js 15 PWA (`apps/web`) + 5 shared packages (ADR-0001).
- **`packages/pricing`** — `calculateQuote()`: 20 kg rice ÷ 67% yield → 29.85 kg paddy; payout = paddy kg × max(lot floor, ₹24.41 MSP); itemized snapshot with expiry and fixed weekly run (ADR-0005).
- **`packages/validation`** — `assertFloorPayout` (MSP floor), `assertAvailableQuantity` (minimum lot).
- **`packages/domain`** — `Role`, `FarmLot`, `QuoteInput`, `QuoteSnapshot`, `Order` contracts.
- **`apps/web`** — role-switched demo (farmer → operator → consumer), localStorage persistence, service-worker PWA shell; `/api/quote` and `/api/orders` demo handlers; one hardcoded lot ("Shivanna · Huliyurdurga, Tumkur").
- **`supabase/migrations/001_farmit_core.sql`** — full schema (profiles, farm_lots, route_templates, partner_quotes, quote_snapshots, orders) with RLS, for the future auth-backed environment.

## Why

The transparent receipt is the product's differentiator; it needed to be provably correct (server-computed, immutable) before anything else was built on top. The Supabase schema was written up-front so demo-local behaviour always had a defined production target.

## Evidence

Baseline was validated by `pnpm typecheck` and `pnpm build`; no formal test log exists for this phase (retroactive).

## Known gaps & limitations

- Single hardcoded lot — not a marketplace.
- No geofence, logistics, AI forecasting/routing, escrow, or auth wiring.
- Client could supply lot fields to the quote API (fixed in Phase 1, ADR-0002).

## What this unblocked

Everything: Phase 1 replaced the hardcoded lot with a catalog and added the geofence on top of the same pricing engine.

## Contributor notes

Start with `packages/pricing/src/index.ts` (the economics) and `docs/ARCHITECTURE.md` (the flows), then `apps/web/app/page.tsx` for the role-based demo shell.
