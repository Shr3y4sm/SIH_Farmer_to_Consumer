import { findSnapshot } from "../../../lib/snapshots";
import { getSessionUser } from "../../../lib/session";

type DemoOrderStatus = "reserved" | "milling" | "in_transit" | "delivered";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (user?.role !== "consumer") return Response.json({ error: "Only consumer accounts can reserve offers." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { quoteId?: string; decision?: "accepted" | "declined" } | null;
  if (!body?.quoteId || !body.decision) return Response.json({ error: "A quote and decision are required." }, { status: 400 });
  const snapshot = findSnapshot(body.quoteId);
  if (!snapshot) return Response.json({ error: "That quote snapshot is not available." }, { status: 404 });
  if (body.decision !== "accepted" && body.decision !== "declined") return Response.json({ error: "Decision must be accepted or declined." }, { status: 400 });
  if (Date.parse(snapshot.expiresAt) <= Date.now()) return Response.json({ error: "That quote snapshot has expired. Publish a fresh snapshot first." }, { status: 410 });
  const order: { id: string; quoteId: string; status: DemoOrderStatus; consumerName: string; createdAt: string; decision: string } = {
    id: `order_${Date.now()}`,
    quoteId: body.quoteId,
    status: body.decision === "accepted" ? "reserved" : "delivered",
    consumerName: "Ananya",
    createdAt: new Date().toISOString(),
    decision: body.decision,
  };
  return Response.json(order, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (user?.role !== "consumer") return Response.json({ error: "Only consumer accounts can update delivery status." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { quoteId?: string; status?: DemoOrderStatus } | null;
  const allowed: DemoOrderStatus[] = ["reserved", "milling", "in_transit", "delivered"];
  if (!body?.quoteId || !body.status || !allowed.includes(body.status)) {
    return Response.json({ error: "A quote and valid delivery status are required." }, { status: 400 });
  }
  if (!findSnapshot(body.quoteId)) return Response.json({ error: "That quote snapshot is not available." }, { status: 404 });
  return Response.json({ quoteId: body.quoteId, status: body.status, updatedAt: new Date().toISOString() });
}
