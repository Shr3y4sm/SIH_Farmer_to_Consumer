# Contributing to FarmIt

Thank you for contributing. This document covers setup, conventions, and the documentation contract that keeps the project flexible for new contributors and future phases.

## Setup

```bash
corepack pnpm install   # pnpm 9.x via corepack (workspace: apps/* + packages/*)
corepack pnpm dev       # Next.js dev server on http://localhost:3000
corepack pnpm typecheck # tsc --noEmit across the workspace
corepack pnpm build     # production build
```

No external services are required — the demo runs entirely on a seeded in-memory catalog and browser localStorage. See `docs/ARCHITECTURE.md` for the demo/production boundary.

## Repository layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js 15 PWA: UI panels, API route handlers, seeded catalog (`lib/catalog.ts`) |
| `packages/domain` | Shared types (records, roles, statuses). No runtime logic. |
| `packages/pricing` | Server-side quote engine, haversine geofence. No React, no I/O. |
| `packages/validation` | Pure guard functions (MSP floor, minimum lot, coordinates). |
| `packages/translations` | UI copy (en/kn). |
| `packages/api-client` | Typed fetch helpers for the API routes. |
| `supabase/migrations` | PostgreSQL schema + RLS for the auth-backed pilot. |
| `docs/` | Architecture, roadmap, deployment, ADRs, phase logs. |

## Conventions

- **TypeScript strict mode** everywhere; shared types live in `packages/domain` only — never redeclare a record shape in an app or route.
- **Layering:** `validation` and `domain` depend on nothing; `pricing` depends only on `domain`; `forecast` on `domain`; `logistics` on `pricing` + `domain`; apps/routes may import all packages. Never import `apps/web` code from a package.
- **Server-owned state:** clients never send prices, payouts or quantities that the server trusts. Catalog lookups happen server-side (ADR-0002, ADR-0003).
- **JSDoc** on every exported function of a package; `// TODO(phase-N):` markers for deferred work, referencing the roadmap.
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`) — one logical change per commit.
- **UI copy:** keep the existing design system (see `apps/web/app/globals.css`); add new classes in the Phase-scoped section at the bottom rather than editing legacy rules; all user-facing strings should exist in both `en` and `kn` in `@farmit/translations`.
- **Demo data must be labelled:** coordinates and economics are illustrative; keep the "Illustrative demo data" footer and in-UI labels intact.

## How to: common tasks

- **Add an API route:** create `apps/web/app/api/<name>/route.ts`, add request/response types to `@farmit/api-client`, validate inputs with `@farmit/validation`, and document the endpoint in `README.md` → *Marketplace API*.
- **Add a shared concept:** type in `packages/domain`, guards in `packages/validation`, server logic in `packages/pricing`, then consume from routes/UI.
- **Add a catalog lot:** append to `seedLots` in `apps/web/lib/catalog.ts` (keep coordinates approximate and labelled) — or, at pilot, insert into Supabase `farm_lots`.
- **Change pricing math:** `packages/pricing/src/index.ts` is the single source. Any change must update the quote breakdown shown in the consumer offer card and the phase-log evidence.

## Documentation contract (end of every phase)

Run this checklist before closing a phase — it is what keeps the project navigable:

- [ ] `docs/phases/PHASE-N-<name>.md` written from `docs/phases/TEMPLATE.md`, with **real test evidence**
- [ ] `CHANGELOG.md` updated and version bumped
- [ ] `docs/ROADMAP.md` requirements matrix refreshed
- [ ] New decisions captured as ADRs in `docs/decisions/` (accepted ADRs are never edited; supersede instead)
- [ ] `docs/ARCHITECTURE.md` / `docs/DEPLOYMENT.md` updated if a boundary changed
- [ ] New exported functions carry JSDoc; deferred work carries `TODO(phase-N):` markers

## Pull request checklist

- [ ] `corepack pnpm typecheck` and `corepack pnpm build` pass locally
- [ ] API behaviour verified against the running server (curl or the demo UI)
- [ ] Guardrails exercised: MSP floor, minimum quantity, coordinates, unknown lot → 4xx
- [ ] Docs updated per the contract above
