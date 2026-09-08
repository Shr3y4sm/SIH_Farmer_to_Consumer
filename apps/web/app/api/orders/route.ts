type DemoOrderStatus = "reserved" | "milling" | "in_transit" | "delivered";

export async function POST(request: Request) {
  const body = (await request.json()) as { quoteId?: string; decision?: "accepted" | "declined" };
  if (!body.quoteId || !body.decision) return Response.json({ error: "A quote and decision are required." }, { status: 400 });
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
  const body = (await request.json()) as { quoteId?: string; status?: DemoOrderStatus };
  const allowed: DemoOrderStatus[] = ["reserved", "milling", "in_transit", "delivered"];
  if (!body.quoteId || !body.status || !allowed.includes(body.status)) {
    return Response.json({ error: "A quote and valid delivery status are required." }, { status: 400 });
  }
  return Response.json({ quoteId: body.quoteId, status: body.status, updatedAt: new Date().toISOString() });
}