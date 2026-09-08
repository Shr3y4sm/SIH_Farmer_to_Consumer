import type { ConsumerLocation } from "@farmit/domain";

/**
 * Demo demand data for Phase 2 — labelled illustrative in the UI.
 * Deterministic (seeded PRNG, fixed anchor week) so forecast and route outputs are reproducible
 * for judging and tests. At pilot this is replaced by real order history from Supabase.
 */

export const DEMAND_VARIETY = "Sona Masuri";
export const DEMAND_WEEKS = 16;

/** Fixed anchor: the Saturday the current (last) history week ends on. */
const ANCHOR_SATURDAY = "2026-09-12";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weekLabel(weekEndingIso: string): string {
  const date = new Date(`${weekEndingIso}T00:00:00Z`);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function buildHistory(): { weekLabel: string; bags: number }[] {
  const random = mulberry32(42);
  const points: { weekLabel: string; bags: number }[] = [];
  for (let i = 0; i < DEMAND_WEEKS; i++) {
    const weeksAgo = DEMAND_WEEKS - 1 - i; // 15 … 0 (last = current week)
    const saturday = new Date(`${ANCHOR_SATURDAY}T00:00:00Z`);
    saturday.setUTCDate(saturday.getUTCDate() - 7 * weeksAgo);
    const base = 24;
    const trend = 0.55 * (DEMAND_WEEKS - 1 - weeksAgo); // mild upward growth
    const seasonal = 3 * Math.sin((2 * Math.PI * i) / 4); // 4-week cycle
    const noise = (random() - 0.5) * 4;
    const bags = Math.max(8, Math.round(base + trend + seasonal + noise));
    points.push({ weekLabel: weekLabel(saturday.toISOString().slice(0, 10)), bags });
  }
  return points;
}

export const DEMAND_HISTORY = buildHistory();

/** Labels for the four weeks after the anchor week. */
export const FORECAST_WEEK_LABELS = [1, 2, 3, 4].map((step) => {
  const saturday = new Date(`${ANCHOR_SATURDAY}T00:00:00Z`);
  saturday.setUTCDate(saturday.getUTCDate() + 7 * step);
  return weekLabel(saturday.toISOString().slice(0, 10));
});

/** FPO consolidation hubs for the relay model (approximate coordinates, illustrative). */
export const FPO_HUBS = [
  { id: "hub_tumkur", label: "Tumkur FPO hub", latitude: 13.34, longitude: 77.1 },
  { id: "hub_ramanagara", label: "Ramanagara FPO hub", latitude: 12.72, longitude: 77.28 },
  { id: "hub_nelamangala", label: "Nelamangala FPO hub", latitude: 13.1, longitude: 77.39 },
] satisfies ConsumerLocation[];

/** Urban dark store the bulk relays deliver to (co-located with the Jayanagar consumer hub). */
export const DARK_STORE: ConsumerLocation = { id: "store_jayanagar", label: "Jayanagar dark store", latitude: 12.9308, longitude: 77.5838 };

/** Deterministic demo pickup loads (kg) mapped onto the nearest in-ring lots. */
export const SEED_PICKUP_LOADS_KG = [20, 60, 40, 80, 20, 100, 60, 40];
