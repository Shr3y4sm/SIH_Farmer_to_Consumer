import { findLot } from "../../../../lib/catalog";
import { getSessionUser } from "../../../../lib/session";

type ConsumerOrder = {
  id: string;
  lotId: string;
  farmerName: string;
  consumerName: string;
  riceKg: number;
  deliveryNote: string;
  status: "requested";
  createdAt: string;
};

const runtime = globalThis as typeof globalThis & { __farmitConsumerOrders?: ConsumerOrder[] };
const orders = (runtime.__farmitConsumerOrders ??= []);

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (user?.role !== "consumer") return Response.json({ error: "Only consumer accounts can view marketplace requests." }, { status: 403 });
  return Response.json({ orders: orders.filter((order) => order.consumerName === user.name) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (user?.role !== "consumer") return Response.json({ error: "Only consumer accounts can request produce." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { lotId?: string; riceKg?: number; deliveryNote?: string } | null;
  const lotId = String(body?.lotId ?? "").trim();
  const riceKg = Number(body?.riceKg);
  const deliveryNote = String(body?.deliveryNote ?? "").trim();
  if (!lotId || !Number.isFinite(riceKg) || riceKg < 1 || riceKg > 100) {
    return Response.json({ error: "Choose a farm and request between 1 and 100 kg of rice." }, { status: 400 });
  }
  if (deliveryNote.length > 240) return Response.json({ error: "Delivery notes must be 240 characters or fewer." }, { status: 400 });

  const lot = findLot(lotId);
  if (!lot) return Response.json({ error: "That farm listing is no longer available." }, { status: 404 });

  const order: ConsumerOrder = {
    id: `req_${Date.now().toString(36)}`,
    lotId: lot.id,
    farmerName: lot.farmerName,
    consumerName: user.name,
    riceKg: Math.round(riceKg * 10) / 10,
    deliveryNote,
    status: "requested",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return Response.json(order, { status: 201, headers: { "Cache-Control": "no-store" } });
}
