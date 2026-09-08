import { GEOFENCE_RADIUS_KM, filterLotsWithinGeofence } from "@farmit/pricing";
import { assertAvailableQuantity, assertCoordinates, assertFloorPayout } from "@farmit/validation";
import type { FarmLot } from "@farmit/domain";
import { CONSUMER_HUBS, addLot, listLots, nextLotId } from "../../../lib/catalog";

function parseOrigin(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  if (lat === null && lng === null) return { origin: CONSUMER_HUBS[0], error: null as string | null };
  const latitude = Number(lat);
  const longitude = Number(lng);
  try {
    assertCoordinates(latitude, longitude);
  } catch (error) {
    return { origin: null, error: error instanceof Error ? error.message : "Invalid coordinates." };
  }
  return { origin: { id: "hub_custom", label: "Custom location", latitude, longitude }, error: null as string | null };
}

export async function GET(request: Request) {
  const { origin, error } = parseOrigin(request);
  if (!origin) return Response.json({ error }, { status: 400 });
  const lots = filterLotsWithinGeofence(listLots(), origin);
  return Response.json(
    { origin, radiusKm: GEOFENCE_RADIUS_KM, lots, outsideCount: lots.filter((lot) => !lot.withinGeofence).length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Omit<FarmLot, "id"> | null;
  if (!body) return Response.json({ error: "A lot payload is required." }, { status: 400 });

  const farmerName = String(body.farmerName ?? "").trim();
  const village = String(body.village ?? "").trim();
  if (!farmerName || !village) {
    return Response.json({ error: "A farmer name and village are required." }, { status: 400 });
  }
  try {
    assertFloorPayout(Number(body.floorPayoutPerKg));
    assertAvailableQuantity(Number(body.quantityKg));
    assertCoordinates(Number(body.latitude), Number(body.longitude));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The lot failed validation." }, { status: 400 });
  }

  const lot: FarmLot = {
    id: nextLotId(),
    farmerName,
    village,
    variety: "Sona Masuri",
    quantityKg: Number(body.quantityKg),
    floorPayoutPerKg: Number(body.floorPayoutPerKg),
    harvestDate: String(body.harvestDate || new Date().toISOString().slice(0, 10)),
    qualityNote: String(body.qualityNote || "Freshly harvested paddy"),
    latitude: Number(body.latitude),
    longitude: Number(body.longitude),
  };
  addLot(lot);
  return Response.json(lot, { status: 201, headers: { "Cache-Control": "no-store" } });
}