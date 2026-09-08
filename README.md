# FarmIt v1

FarmIt is an Android-ready Next.js prototype for one transparent 20 kg Sona Masuri weekly order from Tumkur to Jaynagar.

## Run locally

```bash
corepack pnpm install
corepack pnpm dev
```

Open `http://localhost:3000`. The prototype uses a seeded demo session so the complete farmer → operator → consumer path can be exercised without credentials or a remote Supabase project. Switch roles from **View as**. The operator generates the server-owned quote snapshot; the consumer can then reserve or decline it.

The production build and typecheck can be run with `corepack pnpm build` and `corepack pnpm typecheck`.

## Workspace shape

- `apps/web`: Next.js PWA shell, demo workflows, and route handlers
- `packages/domain`: shared records and role/status contracts
- `packages/pricing`: server-side yield conversion, rupee rounding, and quote calculation
- `packages/validation`: floor payout and minimum-lot guards
- `packages/translations`: English/Kannada UI copy
- `supabase/migrations`: PostgreSQL tables and row-level policies for the real auth-backed environment

The current API route handlers are intentionally demo-local. Before a pilot, replace their seeded lot and in-memory order behavior with Supabase queries and email/password sessions. The quote snapshot should remain immutable after publication.

## Pricing guardrails

The demo uses a 67% documented milling yield and a ₹24.41/kg 2026–27 common-paddy MSP reference. A 20 kg rice offer therefore requires 29.85 kg of paddy before milling, packaging, logistics, platform charge, or tax. All visible seed figures are labelled illustrative demo data in the UI.