# ADR-0001: pnpm monorepo with a shared-packages workspace

- **Status:** Accepted (2026-09-08, retroactive to baseline)
- **Context:** FarmIt has server-side domain logic (pricing, geofence) that must be reusable by the Next.js app, future mobile shells, and Phase 2 batch jobs — without drift between copies.
- **Decision:** A pnpm workspace monorepo (`apps/*`, `packages/*`): `apps/web` (Next.js 15) plus five shared packages (`domain`, `pricing`, `validation`, `translations`, `api-client`) consumed via workspace protocol and direct TS source exports (`"exports": "./src/index.ts"` — no build step per package).
- **Consequences:** Zero package-build overhead; typecheck covers everything; Next.js compiles workspace TS directly. Package APIs must stay layer-clean (see `ARCHITECTURE.md`).
- **Alternatives rejected:** single Next.js app (fine for a demo, but pricing logic would entangle with React and Phase 2 jobs would duplicate it); Turborepo/Nx (unnecessary build-orchestration complexity at this size).
