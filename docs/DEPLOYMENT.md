# Deployment & Operations

From zero-setup demo to real users, in three environments. Read with `docs/ARCHITECTURE.md` (the demo/production boundary table).

## Environment 1 — Local demo (current)

```bash
corepack pnpm install
corepack pnpm dev        # http://localhost:3000
corepack pnpm build && corepack pnpm start   # production build locally
```

No services required. Catalog and orders are in-memory/localStorage; data resets on server restart (ADR-0003). PWA service worker registers automatically.

## Environment 2 — Pilot (Supabase-backed)

The schema and RLS already exist in `supabase/migrations/001_farmit_core.sql`. Wiring steps, in order:

1. **Create the Supabase project** and apply the migration (`supabase db push` or the SQL editor).
2. **Auth:** enable email/password; create a `profiles` row per signup (trigger on `auth.users` insert) with `role ∈ {farmer, operator, consumer}`.
3. **Replace the catalog:** in API routes, swap `lib/catalog.ts` calls for Supabase queries against `farm_lots` (`id, farmer_id, variety, village, quantity_kg, floor_payout_per_kg, harvest_date, quality_note`). Keep `assertFloorPayout`/`assertAvailableQuantity` server-side — RLS is not a substitute for input validation.
4. **Persist snapshots:** insert every published quote into `quote_snapshots` (immutable JSONB, `expires_at`); consumer orders reference `quote_snapshot_id` (unique — one order per snapshot, matching the demo's "fixed snapshot" contract).
5. **Geospatial (when lots grow):** enable PostGIS, add `geography(point, 4326)` + GIST index to `farm_lots`, replace haversine filtering with `ST_DWithin(geog, origin, 100000)` (ADR-0004).
6. **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env*` is gitignored; commit `.env.example` only).
7. **Row Level Security** is already enabled on all tables; verify with the policies in the migration before exposing.

## Environment 3 — Hosting & scale

| Concern | Recommendation | Rationale |
|---|---|---|
| Hosting | Vercel (Next.js native) or Fly.io/Railway for long-lived processes | routes are stateless once demo stores are removed |
| Database | Supabase Postgres (same region as users, e.g. Mumbai `ap-south-1`) | latency + data residency |
| Geofence queries | PostGIS + GIST index | haversine-over-all-rows is fine ≤ ~10k lots, then `ST_DWithin` (ADR-0004) |
| Caching | `/api/lots` responses are cacheable per-origin for 30–60 s; quotes are `no-store` | snapshots must stay authoritative |
| Rate limiting | per-IP on `POST /api/lots` and `/api/quote` at the edge | cheap write endpoints |
| Observability | structured request logs + error tracking (Sentry) from pilot day | escrow-adjacent flows need auditability |
| Frontend scale | PWA + service worker already present; static hero/branding via CDN | low device-spec users on rural networks |
| Queue/workloads | Phase 2 forecasting/routing as scheduled jobs (cron), not request-time compute | keeps API latency stable |

## Feasibility notes for real users

- **Payments/escrow (Phase 3):** requires a licensed payment partner for split settlement; the QR handshake is only the *verification* trigger, not the money flow. Decide the partner before pilot.
- **Onboarding farmers/FPOs:** the two-relay FPO-hub model (deck) assumes village-level aggregation partners; catalog `farm_lots` has no FPO grouping yet — Phase 2.
- **Data honesty:** all demo economics are labelled illustrative; at pilot, MSP references must be sourced and dated (current seed: ₹24.41/kg common paddy, 2026–27 reference).
- **Regional languages:** translations package is structured for growth (en/kn today).

## Operations checklist (pre-pilot)

- [ ] `pnpm typecheck` and `pnpm build` green in CI
- [ ] Supabase migration applied; RLS policies verified per role
- [ ] `.env.example` documents every variable; no secrets in repo
- [ ] Demo-local stores fully removed (grep `lib/catalog` usages)
- [ ] Load test the geofence query at expected pilot lot count
- [ ] Backup policy for `quote_snapshots` (immutable audit trail)