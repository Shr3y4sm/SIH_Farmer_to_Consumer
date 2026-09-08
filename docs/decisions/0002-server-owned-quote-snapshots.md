# ADR-0002: server-owned quote snapshots (lot resolved by lotId)

- **Status:** Accepted (2026-09-08, Phase 1)
- **Context:** In the baseline, `POST /api/quote` accepted the full lot (including `floorPayoutPerKg`) from the client. Any consumer or operator could request a quote with a fabricated payout — undermining the MSP-floor guarantee that is the product's core trust claim.
- **Decision:** The quote API accepts `QuoteInput` + `lotId` only. The server resolves the lot from its own catalog and computes the payout. Unknown lots → 404. The resulting `QuoteSnapshot` is immutable after publication; the consumer receipt renders it verbatim.
- **Consequences:** Farmers' floors cannot be spoofed (verified by test in `PHASE-1-marketplace.md`). Requires a server-side source of truth for lots — see ADR-0003 (demo) and the Supabase migration path. Breaking API change vs v0.1.0, recorded in the changelog.
- **Alternatives rejected:** signing client-supplied lots (complex, still trusts stale data); trusting the client and validating afterwards (replay/spoof surface).
