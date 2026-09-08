# ADR-0008: deck-aligned 10% platform-fee model

- **Status:** Accepted (2026-09-08, Phase 3 — deferred from Phase 2 by decision)
- **Context:** The pitch's economics slide charges a flat "10% FarmIt transaction fee" (₹86 on ₹860 of cost of goods + logistics → ₹946 consumer total). The v1 engine instead used a flat ₹35 platform charge plus 5% tax, producing totals (~₹1,204) that contradicted the deck.
- **Decision:** `calculateQuote` now computes `platformCharge = 10% × (farmer payout + milling + packaging/QA + all freight legs)` (`PLATFORM_FEE_RATE = 0.1` in `@farmit/pricing`). GST remains an operator input (`taxRate`, default 0 in the demo, excluded from the deck's ₹946 figure). The operator's flat platform-charge field was removed from `QuoteInput` — a recorded breaking API change.
- **Consequences:** With deck-aligned operator inputs the demo total is **₹999.50** (farmer ₹728.64 + mill ₹80 + freight ₹100 + fee ₹90.86) — near the deck's ₹946, and *above* it because the farmer payout is MSP-floored at ₹728.64 rather than the deck's illustrative ₹680. The farmer-always-above-MSP invariant is untouched. Demo defaults changed; operators can still set GST > 0 for realistic receipts.
- **Alternatives rejected:** keeping both fee fields (confusing dual models); fee on consumer-side markup (the deck charges the transaction fee, not a markup).
