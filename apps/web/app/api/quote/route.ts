import { calculateQuote } from "@farmit/pricing";
import type { QuoteInput } from "@farmit/domain";
import { findLot } from "../../../lib/catalog";
import { saveSnapshot } from "../../../lib/snapshots";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as (QuoteInput & { lotId?: string }) | null;
  if (!body?.lotId) return Response.json({ error: "A lotId is required to price a snapshot." }, { status: 400 });

  // Server-owned lot lookup: the client cannot spoof farmer payouts or quantities.
  const lot = findLot(body.lotId);
  if (!lot) return Response.json({ error: "That lot is not in the marketplace catalog." }, { status: 404 });

  const { lotId, ...input } = body;
  try {
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