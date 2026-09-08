import { calculateQuote } from "@farmit/pricing";
import type { FarmLot, QuoteInput } from "@farmit/domain";

const demoLot: FarmLot = {
  id: "lot_tumkur_01",
  farmerName: "Shivanna",
  village: "Huliyurdurga, Tumkur",
  variety: "Sona Masuri",
  quantityKg: 680,
  floorPayoutPerKg: 24.41,
  harvestDate: "2026-09-02",
  qualityNote: "Clean grain · 13% moisture · locally harvested",
};

export async function POST(request: Request) {
  const body = (await request.json()) as QuoteInput & { lot?: Partial<FarmLot> };
  const { lot, ...input } = body;
  const quote = calculateQuote({ ...demoLot, ...lot, id: demoLot.id, variety: "Sona Masuri" }, input);
  return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
}