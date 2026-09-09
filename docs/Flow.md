# User Flows — Tester Handbook

Every user journey in FarmIt v0.4.x, with exact steps and expected results.
Run against a clean state: click **Reset demo** (topbar) before each flow.
Default demo economics (Shivanna's lot): farmer ₹728.64 + mill ₹80 + freight ₹100
→ subtotal ₹908.64 → FarmIt fee ₹90.86 (10%) → **total ₹999.50**, GST ₹0.

## Setup

    corepack pnpm install
    corepack pnpm dev        # http://localhost:3000

No remote services are needed, but the demo is authentication-gated. Use the
seeded `farmer@farmit.in`, `operator@farmit.in`, and `consumer@farmit.in`
accounts on the login screen; sign out and sign in as the next role. Language
is toggled via the ಕನ್ನಡ / English button.

---

## Flow 1 — Consumer: browse the geofenced marketplace

1. Open the app (consumer role).
2. EXPECT "Nearby farmers" grid: **11 farm cards, nearest-first**
   (Prakash · Nelamangala 28.2 km → Basavaraj · Madhugiri 90.6 km),
   orange distance badge on each card.
3. EXPECT the guardrail note: "◈ 3 lots hidden — outside the 100 km sourcing
   ring" (Sira, Pavagada, Tiptur are seeded out-of-ring).
4. EXPECT the demand note under the grid (green): "~30.9 bags expected next
   week … 249.9 bags of paddy supply within 100 km — supply is comfortable."
5. Click any farm card → orange selected border.
   EXPECT "No published snapshot yet" (nothing priced yet) with a link to the
   operator desk.
PASS: all of the above, and no layout break at mobile width (≤480px).

## Flow 2 — Operator: publish a price snapshot

1. Switch to **operator**.
2. Pick a lot from the dropdown (shows `Farmer · Village · km`).
3. Inspect cost inputs: Milling ₹4/kg, Packaging ₹0, freight legs 30/40/30,
   **GST rate %** (no platform-charge field — the fee is fixed at 10%).
4. Click **Publish fixed snapshot**.
   EXPECT footnote "Published total for <farmer>: ₹999.50 · expires <date+48h>".
5. Click publish again → button reads "Publish replacement snapshot".
6. Switch the dropdown to a different farm → button reverts to
   "Publish fixed snapshot" (snapshots are per-lot).
7. GST variant: enter GST 5%, publish → total ₹1,044.93; consumer receipt and
   audit ledger gain a GST ₹45.43 row. Reset GST to 0 afterwards.
PASS: server-computed totals; fee always exactly 10% of subtotal.

## Flow 3 — Operator: demand outlook & logistics desk

1. Stay on the operator desk → "Demand outlook" card below the form:
   EXPECT sparkline (solid history, dashed forecast), next week ~30.9 bags
   (28.4–33.4), trend +0.44 bags/wk, ±6.8% MAPE, 4-week total 124.2 bags,
   "249.9 bags supply nearby" pill.
2. Click "Open the logistics desk…" (or sidebar → ⬡ Logistics).
3. EXPECT summary tiles: **49.7%** saved · 381.7 km consolidated · 758.4 km
   baseline · 376.7 km saved.
4. EXPECT 3 relay cards grouped by hub:
   Nelamangala: Prakash → Chikkamma → Venkatesh → Muniraju (200 kg);
   Ramanagara: Sowbhagya → Thimmaraju (120 kg); Tumkur: Manjula → Lakshmamma
   (100 kg) — each with pickup km + line-haul km.
PASS: hub grouping matches each farm's nearest hub; numbers are deterministic
across reloads.

## Flow 4 — Consumer: reserve → escrow → QR → release (the core journey)

1. Consumer role → select the priced farm → offer card with the full
   itemized receipt (last row "FarmIt fee · 10%" ₹90.86; GST row hidden at 0%).
2. Click **Reserve this demo offer**.
   EXPECT the **Audit ledger · escrow** box: amber pill "Held (simulated)";
   rows Farmer ₹728.64 / Miller ₹80 / Transporters ₹100 / FarmIt fee ₹90.86 /
   Escrow total ₹999.50. Timeline step 1 lights up.
3. Click **Advance delivery** → "Milling & packing" (ledger still held).
4. Advance again → "On the road": EXPECT the **QR box** (real scannable SVG QR)
   + code `FARMIT-XXXXXXXX` + pill "Held · out for delivery".
5. Scan the QR with a phone camera → decodes to the printed code.
6. Click **Simulate courier scan · release escrow**.
   EXPECT pill "Released & paid", order "Delivered", timeline fully lit,
   notice "…every party paid (simulated)."
7. Decline variant: reset, republish, click **Decline offer** → amber declined
   box; no escrow is created.
8. Cross-farm binding: with a live snapshot for farm X, select farm Y →
   "Snapshot is for another farm"; back to X restores the offer.
PASS: ledger rows sum exactly to the escrow total at every stage; release
requires the code.

## Flow 5 — Farmer: list a lot

1. Switch to **farmer** → fill Farmer name, pick a village (coordinates
   auto-fill), quantity 400 kg, floor ₹24.60 → **List lot in marketplace**.
2. Switch to consumer → EXPECT the new card in the grid at the correct
   distance (Kunigal ≈ 60.8 km), sorted into position by distance.
3. Price it as operator and run Flow 4 on it.
4. Negative tests (client blocks, no request sent):
   quantity 10 OR floor ₹18 → "Lot needs at least 29.85 kg and a ₹24.41/kg
   minimum payout."; empty farmer name → name-required notice.
PASS: new lot survives page refresh and Next development hot reloads within the
session (the demo catalog still resets on a full server restart).

## Flow 6 — Cross-cutting checks

- **Persistence:** refresh mid-journey → reservation, status, ledger, and QR
  code all survive (localStorage).
- **Language:** toggle ಕನ್ನಡ → headings, nav, buttons translate; numbers/dates
  stay latin. Toggle back.
- **Account panel:** shows role, storage, geofence info, "Disabled in v1"
  payments; **Clear demo session and restart** returns to farmer view clean.
- **Restart caveat (by design):** after a full server restart, an in-flight browser
  escrow release fails closed with "No escrow is held for this snapshot." —
  the documented demo/pilot seam.

---

## API test suite (curl, server running)

    B=http://localhost:3000
    # geofence scan — 11 in-ring, outsideCount 3, nearest-first
    curl -s "$B/api/lots?lat=12.9308&lng=77.5838"
    # quote — expect total 999.5 for lot_tumkur_01 with deck-aligned inputs
    Q=$(curl -s -X POST $B/api/quote -H 'content-type: application/json' \
      -d '{"lotId":"lot_tumkur_01","millingPerKg":4,"packagingQaPerKg":0,
           "farmToMill":30,"weeklyLineHaul":40,"lastMile":30,
           "taxRate":0,"expiresInHours":48}')
    QID=$(echo "$Q" | sed 's/.*"id":"\([^"]*\)".*/\1/')
    # escrow lifecycle
    curl -s -X POST $B/api/escrow -H 'content-type: application/json' \
      -d "{\"quoteId\":\"$QID\",\"action\":\"hold\"}"
    curl -s -X POST $B/api/escrow -H 'content-type: application/json' \
      -d "{\"quoteId\":\"$QID\",\"action\":\"dispatch\"}"     # returns code
    curl -s "$B/api/escrow/qr?code=FARMIT-TEST1234" | head -c 80   # SVG
    # AI endpoints
    curl -s "$B/api/forecast?horizon=4"
    curl -s -X POST $B/api/routes -H 'content-type: application/json' -d '{}'
    # guards (all expect 4xx)
    curl -s -X POST $B/api/lots -H 'content-type: application/json' \
      -d '{"farmerName":"X","village":"Y","quantityKg":10,"floorPayoutPerKg":18,
           "latitude":13,"longitude":77}'                    # 400
    curl -s -X POST $B/api/quote -H 'content-type: application/json' \
      -d '{"lotId":"nope","millingPerKg":4}'                 # 404
    curl -s -X POST $B/api/quote -H 'content-type: application/json' \
      -d '{"lotId":"lot_tumkur_01","millingPerKg":4,"floorPayoutPerKg":99}'  # spoof ignored

## Fail-closed matrix

| Attempt | Expected |
|---|---|
| Hold escrow for unpublished snapshot | 404 |
| Dispatch before hold / double dispatch | 409 |
| Release with wrong code | 400 "Delivery code mismatch" |
| Double release | 400 |
| Lot below MSP floor / < 29.85 kg / bad coordinates | 400 |
| Quote for unknown lotId | 404 |
| Client-sent inflated payout | ignored (server catalog wins) |

## Known demo limitations (not bugs)

- Catalog, snapshots, escrow and orders are in-memory — they reset on server
  restart (Supabase replaces them at pilot; see docs/DEPLOYMENT.md).
- Payments are simulated; the escrow record shape is the gateway contract.
- Distances are great-circle (haversine) over village centroids.
- Coordinates and economics are labelled illustrative demo data in the UI.
