import type { ConsumerLocation, FarmLot, GeofenceLot, Order, QuoteInput, QuoteSnapshot } from "@farmit/domain";

export type GenerateQuoteRequest = QuoteInput & { lotId: string };
export type GenerateQuoteResponse = QuoteSnapshot;
export type NearbyLotsResponse = { origin: ConsumerLocation; radiusKm: number; lots: GeofenceLot[] };
export type CreateLotRequest = Omit<FarmLot, "id">;
export type DecideOrderRequest = { quoteId: string; decision: "accepted" | "declined" };
export type DecideOrderResponse = Order & { decision: DecideOrderRequest["decision"] };

export async function generateQuote(baseUrl: string, input: GenerateQuoteRequest): Promise<GenerateQuoteResponse> {
  const response = await fetch(`${baseUrl}/api/quote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("Unable to generate quote");
  return response.json() as Promise<GenerateQuoteResponse>;
}

export async function fetchNearbyLots(baseUrl: string, latitude: number, longitude: number): Promise<NearbyLotsResponse> {
  const response = await fetch(`${baseUrl}/api/lots?lat=${latitude}&lng=${longitude}`);
  if (!response.ok) throw new Error("Unable to load the marketplace catalog");
  return response.json() as Promise<NearbyLotsResponse>;
}

export async function createLot(baseUrl: string, lot: CreateLotRequest): Promise<FarmLot> {
  const response = await fetch(`${baseUrl}/api/lots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lot) });
  if (!response.ok) throw new Error("Unable to list the lot");
  return response.json() as Promise<FarmLot>;
}