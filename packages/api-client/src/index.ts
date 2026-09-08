import type { Order, QuoteInput, QuoteSnapshot } from "@farmit/domain";

export type GenerateQuoteRequest = QuoteInput;
export type GenerateQuoteResponse = QuoteSnapshot;
export type DecideOrderRequest = { quoteId: string; decision: "accepted" | "declined" };
export type DecideOrderResponse = Order & { decision: DecideOrderRequest["decision"] };

export async function generateQuote(baseUrl: string, input: GenerateQuoteRequest): Promise<GenerateQuoteResponse> {
  const response = await fetch(`${baseUrl}/api/quote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("Unable to generate quote");
  return response.json() as Promise<GenerateQuoteResponse>;
}