import { filterLotsWithinGeofence } from "@farmit/pricing";
import { forecastDemand } from "@farmit/forecast";
import { CONSUMER_HUBS, listLots } from "../../../lib/catalog";
import { DEMAND_HISTORY, DEMAND_VARIETY, FORECAST_WEEK_LABELS } from "../../../lib/demand-history";

const PADDY_KG_PER_BAG = 29.85; // 20 kg rice at 67% documented yield

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawHorizon = Number(url.searchParams.get("horizon") ?? 4);
  const horizon = Number.isFinite(rawHorizon) ? Math.min(4, Math.max(1, Math.round(rawHorizon))) : 4;

  try {
    const result = forecastDemand(DEMAND_HISTORY.map((point) => point.bags), horizon, { labels: FORECAST_WEEK_LABELS.slice(0, horizon) });
    const hub = CONSUMER_HUBS[0];
    const inRingKg = filterLotsWithinGeofence(listLots(), hub)
      .filter((lot) => lot.withinGeofence)
      .reduce((sum, lot) => sum + lot.quantityKg, 0);
    const supplyBags = Math.round((inRingKg / PADDY_KG_PER_BAG) * 10) / 10;
    return Response.json(
      { variety: DEMAND_VARIETY, origin: hub.label, history: DEMAND_HISTORY, supplyBags, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Forecast failed." }, { status: 400 });
  }
}
