import { planRelayRoutes, type PickupOrder } from "@farmit/logistics";
import { filterLotsWithinGeofence } from "@farmit/pricing";
import { CONSUMER_HUBS, listLots } from "../../../lib/catalog";
import { DARK_STORE, FPO_HUBS, SEED_PICKUP_LOADS_KG } from "../../../lib/demand-history";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { orders?: PickupOrder[] } | null;
  const hub = CONSUMER_HUBS[0];

  let orders = body?.orders;
  if (!orders) {
    // Default demo batch: the nearest in-ring lots with deterministic pickup loads.
    orders = filterLotsWithinGeofence(listLots(), hub)
      .filter((lot) => lot.withinGeofence)
      .slice(0, SEED_PICKUP_LOADS_KG.length)
      .map((lot, i) => ({
        id: `ord_demo_${i + 1}`,
        lotId: lot.id,
        label: `${lot.farmerName} · ${lot.village}`,
        latitude: lot.latitude,
        longitude: lot.longitude,
        loadKg: SEED_PICKUP_LOADS_KG[i],
      }));
  }

  try {
    const plan = planRelayRoutes(orders, FPO_HUBS, DARK_STORE);
    return Response.json(
      { destination: DARK_STORE, orderCount: orders.length, ...plan },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Route planning failed." }, { status: 400 });
  }
}
