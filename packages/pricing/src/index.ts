import type { FarmLot, QuoteInput, QuoteSnapshot } from "@farmit/domain";

export const DEMO_YIELD_RATE = 0.67;
export const DEMO_PADDY_RATE = 24.41;

const rupees = (value: number) => Math.round(value * 100) / 100;

export function calculateQuote(lot: FarmLot, input: QuoteInput, now = new Date()): QuoteSnapshot {
  const riceKg = 20;
  const paddyKg = rupees(riceKg / DEMO_YIELD_RATE);
  const paddyPayout = rupees(paddyKg * Math.max(lot.floorPayoutPerKg, DEMO_PADDY_RATE));
  const milling = rupees(input.millingPerKg * riceKg);
  const packagingQa = rupees(input.packagingQaPerKg * riceKg);
  const taxableSubtotal = paddyPayout + milling + packagingQa + input.farmToMill + input.weeklyLineHaul + input.lastMile;
  const platformCharge = rupees(input.platformCharge);
  const tax = rupees(taxableSubtotal * input.taxRate);

  return {
    id: `qs_${now.getTime()}`,
    lotId: lot.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + input.expiresInHours * 60 * 60 * 1000).toISOString(),
    riceKg,
    paddyKg,
    yieldRate: DEMO_YIELD_RATE,
    paddyRate: Math.max(lot.floorPayoutPerKg, DEMO_PADDY_RATE),
    paddyPayout,
    milling,
    packagingQa,
    farmToMill: rupees(input.farmToMill),
    lineHaul: rupees(input.weeklyLineHaul),
    lastMile: rupees(input.lastMile),
    platformCharge,
    tax,
    total: rupees(taxableSubtotal + platformCharge + tax),
    weeklyRun: "Every Saturday · 8:00–11:00 AM",
  };
}