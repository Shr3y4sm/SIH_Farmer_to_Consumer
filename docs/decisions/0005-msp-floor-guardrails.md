# ADR-0005: MSP-linked floor payout and minimum-lot guardrails, enforced server-side

- **Status:** Accepted (2026-09-08, retroactive to baseline; hardened in Phase 1)
- **Context:** The product guarantees "FarmIt will not generate an offer below the farmer's chosen payout" and never below the common-paddy MSP reference (₹24.41/kg, 2026–27). A 20 kg rice offer is impossible below 29.85 kg paddy at the documented 67% yield.
- **Decision:** `packages/validation` exports pure guards — `assertFloorPayout` (≥ MSP), `assertAvailableQuantity` (≥ 29.85 kg), `assertCoordinates` — plus named constants (`MSP_FLOOR_PER_KG`, `MIN_PADDY_KG_FOR_20_RICE`). They run in API routes (`POST /api/lots`) and are mirrored inside the pricing engine (`Math.max(lot floor, MSP)`), so the invariant holds even if a caller skips validation. Supabase checks (`quantity_kg >= 29.85`, `floor_payout_per_kg >= 24.41`) backstop at the database.
- **Consequences:** Defense in depth across app and DB; guards are trivially unit-testable. When the MSP reference changes (seasonal/government revision), update the constants in one place and the seed data — the consumer-facing yield note stays accurate.
- **Alternatives rejected:** validating only in the UI (bypassable); DB checks alone (no readable errors for the API layer).
