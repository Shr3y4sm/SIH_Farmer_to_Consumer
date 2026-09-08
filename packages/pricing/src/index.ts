import type { FarmLot, GeofenceLot, QuoteInput, QuoteSnapshot } from "@farmit/domain";

export const DEMO_YIELD_RATE = 0.67;
export const DEMO_PADDY_RATE = 24.41;
export const GEOFENCE_RADIUS_KM = 100;
/** Deck-aligned transaction fee: 10% of the cost of goods + logistics (ADR-0008). */
export const PLATFORM_FEE_RATE = 0.1;

const rupees = (value: number) => Math.round(value * 100) / 100;

export function calculateQuote(lot: FarmLot, input: QuoteInput, now = new Date()): QuoteSnapshot {
  const riceKg = 20;
  const paddyKg = rupees(riceKg / DEMO_YIELD_RATE);
  const paddyPayout = rupees(paddyKg * Math.max(lot.floorPayoutPerKg, DEMO_PADDY_RATE));
  const milling = rupees(input.millingPerKg * riceKg);
  const packagingQa = rupees(input.packagingQaPerKg * riceKg);
  const subtotal = paddyPayout + milling + packagingQa + input.farmToMill + input.weeklyLineHaul + input.lastMile;
  const platformCharge = rupees(subtotal * PLATFORM_FEE_RATE);
  const tax = rupees(subtotal * input.taxRate);

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
    total: rupees(subtotal + platformCharge + tax),
    weeklyRun: "Every Saturday · 8:00–11:00 AM",
  };
}

export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(a)) * 10) / 10;
}

/** Annotates every lot with its distance from the origin hub and flags the 100 km geofence. */
export function filterLotsWithinGeofence(
  lots: FarmLot[],
  origin: { latitude: number; longitude: number },
  maxKm: number = GEOFENCE_RADIUS_KM,
): GeofenceLot[] {
  return lots
    .map((lot) => {
      const distanceKm = distanceFromOrigin(origin, lot);
      return { ...lot, distanceKm, withinGeofence: distanceKm <= maxKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function distanceFromOrigin(
  origin: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  return distanceKm(origin, to);
}