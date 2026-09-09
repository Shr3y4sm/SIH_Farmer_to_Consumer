import { calculateQuote } from "@farmit/pricing";
import { assertQuoteInput } from "@farmit/validation";
import type { QuoteInput } from "@farmit/domain";
import { findLot } from "../../../lib/catalog";
import { findLatestSnapshotForLot, saveSnapshot } from "../../../lib/snapshots";
import { getSessionUser } from "../../../lib/session";

export async function GET(request: Request) {
  const lotId = new URL(request.url).searchParams.get("lotId")?.trim();
  if (!lotId) return Response.json({ error: "A lotId is required." }, { status: 400 });
  const snapshot = findLatestSnapshotForLot(lotId);
  if (!snapshot) return Response.json({ error: "No published snapshot exists for this farm yet." }, { status: 404 });
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (user?.role !== "operator") return Response.json({ error: "Only operator accounts can publish price snapshots." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as (QuoteInput & { lotId?: string }) | null;
  if (!body?.lotId) return Response.json({ error: "A lotId is required to price a snapshot." }, { status: 400 });

  // Server-owned lot lookup: the client cannot spoof farmer payouts or quantities.
  const lot = findLot(body.lotId);
  if (!lot) return Response.json({ error: "That lot is not in the marketplace catalog." }, { status: 404 });

  const { lotId, ...input } = body;
  try {
    assertQuoteInput(input);
    const quote = calculateQuote(lot, input);
    // Persist server-side so escrow splits are computed from the immutable snapshot, never from client payloads.
    saveSnapshot(quote);
    return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The quote could not be calculated." },
      { status: 400 },
    );
  }
}
