import { dispatchEscrow, findEscrow, holdEscrow, releaseEscrow } from "../../../lib/escrow";

export async function GET(request: Request) {
  const quoteId = new URL(request.url).searchParams.get("quoteId");
  if (!quoteId) return Response.json({ error: "A quoteId is required." }, { status: 400 });
  const record = findEscrow(quoteId);
  if (!record) return Response.json({ error: "No escrow is held for this snapshot." }, { status: 404 });
  return Response.json(record, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { quoteId?: string; action?: "hold" | "dispatch" | "release"; code?: string } | null;
  if (!body?.quoteId || !body.action) {
    return Response.json({ error: "A quoteId and action (hold | dispatch | release) are required." }, { status: 400 });
  }

  if (body.action === "hold") {
    const record = holdEscrow(body.quoteId);
    if (!record) return Response.json({ error: "Publish a quote snapshot before holding escrow." }, { status: 404 });
    return Response.json(record, { status: 201, headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "dispatch") {
    const record = dispatchEscrow(body.quoteId);
    if (!record) return Response.json({ error: "Escrow must be held (and not yet dispatched) before dispatch." }, { status: 409 });
    return Response.json(record, { headers: { "Cache-Control": "no-store" } });
  }

  // release — requires the delivery code from the doorstep QR handshake.
  const result = releaseEscrow(body.quoteId, body.code ?? "");
  if (!result.record) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result.record, { headers: { "Cache-Control": "no-store" } });
}
