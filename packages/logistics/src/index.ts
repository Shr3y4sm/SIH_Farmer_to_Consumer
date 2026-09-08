/**
 * Relay route planning for the two-stage logistics model (see ADR-0007 and the pitch deck):
 *   Relay 1 — short consolidation hops: farm-gate pickups → local FPO hub (nearest-neighbour + 2-opt tour).
 *   Relay 2 — long bulk line-haul: FPO hub → urban dark store.
 *
 * Deterministic, dependency-free (reuses @farmit/pricing haversine). Explainability beats exotic
 * solvers at this scale: every route can be drawn on paper and verified.
 */
import { distanceKm } from "@farmit/pricing";

export type PickupOrder = {
  id: string;
  lotId: string;
  label: string;
  latitude: number;
  longitude: number;
  loadKg: number;
};

export type Hub = { id: string; label: string; latitude: number; longitude: number };

export type RouteStop = {
  kind: "farm" | "hub" | "store";
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  loadKg?: number;
};

export type RelayRoute = {
  hubId: string;
  hubLabel: string;
  /** Ordered farm-gate pickup tour: hub → farms → hub. */
  pickupStops: RouteStop[];
  pickupKm: number;
  /** Direct bulk hop from the hub to the destination dark store. */
  lineHaulKm: number;
  loadKg: number;
};

export type RelayPlan = {
  routes: RelayRoute[];
  /** Consolidated plan distance: all pickup tours + one line-haul per hub. */
  totalKm: number;
  /** Baseline: every farmer driving to the destination and back, alone. */
  individualKm: number;
  savedKm: number;
  savedPercent: number;
  method: string;
};

export type PlanOptions = {
  /** Max paddy load per relay-1 pickup vehicle (kg). Batches exceeding it split into more tours. */
  maxLoadKgPerPickupRoute?: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

function nearestNeighbourTour(start: RouteStop, stops: RouteStop[]): RouteStop[] {
  const remaining = [...stops];
  const tour: RouteStop[] = [];
  let current = start;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((stop, i) => {
      const d = distanceKm(current, stop);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    });
    current = remaining.splice(bestIndex, 1)[0];
    tour.push(current);
  }
  return tour;
}

function tourDistance(start: RouteStop, tour: RouteStop[]): number {
  let total = 0;
  let current = start;
  for (const stop of tour) {
    total += distanceKm(current, stop);
    current = stop;
  }
  return total + distanceKm(current, start);
}

/** 2-opt improvement: repeatedly reverse tour segments while it shortens the round trip. */
function twoOpt(start: RouteStop, tour: RouteStop[]): RouteStop[] {
  let improved = tour;
  let best = tourDistance(start, improved);
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let i = 0; i < improved.length - 1; i++) {
      for (let j = i + 1; j < improved.length; j++) {
        const candidate = [...improved.slice(0, i), ...improved.slice(i, j + 1).reverse(), ...improved.slice(j + 1)];
        const candidateDistance = tourDistance(start, candidate);
        if (candidateDistance < best - 0.05) {
          improved = candidate;
          best = candidateDistance;
          swapped = true;
        }
      }
    }
  }
  return improved;
}

export function planRelayRoutes(
  orders: PickupOrder[],
  hubs: Hub[],
  destination: { id: string; label: string; latitude: number; longitude: number },
  options?: PlanOptions,
): RelayPlan {
  const maxLoadKg = options?.maxLoadKgPerPickupRoute ?? 1200;
  if (orders.length === 0) {
    throw new Error("At least one open order is required to plan relay routes.");
  }
  if (hubs.length === 0) {
    throw new Error("At least one FPO hub is required to plan relay routes.");
  }

  // Assign every pickup to its nearest hub.
  const byHub = new Map<string, PickupOrder[]>();
  orders.forEach((order) => {
    let bestHub = hubs[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    hubs.forEach((hub) => {
      const d = distanceKm(hub, order);
      if (d < bestDistance) {
        bestDistance = d;
        bestHub = hub;
      }
    });
    const bucket = byHub.get(bestHub.id) ?? [];
    bucket.push(order);
    byHub.set(bestHub.id, bucket);
  });

  const destinationStop: RouteStop = { kind: "store", id: destination.id, label: destination.label, latitude: destination.latitude, longitude: destination.longitude };
  const routes: RelayRoute[] = [];
  let consolidatedKm = 0;

  byHub.forEach((hubOrders, hubId) => {
    const hub = hubs.find((candidate) => candidate.id === hubId) ?? hubs[0];
    const hubStop: RouteStop = { kind: "hub", id: hub.id, label: hub.label, latitude: hub.latitude, longitude: hub.longitude };
    const lineHaulKm = round1(distanceKm(hub, destination));

    // Capacity batching: split large clusters into multiple pickup vehicles.
    const batches: PickupOrder[][] = [];
    let currentBatch: PickupOrder[] = [];
    let currentLoad = 0;
    hubOrders.forEach((order) => {
      if (currentLoad + order.loadKg > maxLoadKg && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentLoad = 0;
      }
      currentBatch.push(order);
      currentLoad += order.loadKg;
    });
    if (currentBatch.length > 0) batches.push(currentBatch);

    batches.forEach((batch) => {
      const stops: RouteStop[] = batch.map((order) => ({ kind: "farm", id: order.id, label: order.label, latitude: order.latitude, longitude: order.longitude, loadKg: order.loadKg }));
      const ordered = twoOpt(hubStop, nearestNeighbourTour(hubStop, stops));
      const pickupKm = round1(tourDistance(hubStop, ordered));
      consolidatedKm += pickupKm;
      routes.push({
        hubId: hub.id,
        hubLabel: hub.label,
        pickupStops: [hubStop, ...ordered, hubStop],
        pickupKm,
        lineHaulKm,
        loadKg: batch.reduce((sum, order) => sum + order.loadKg, 0),
      });
    });

    // One line-haul per hub (shared across that hub's pickup vehicles).
    consolidatedKm += lineHaulKm;
  });

  const individualKm = round1(orders.reduce((sum, order) => sum + 2 * distanceKm(order, destination), 0));
  const savedKm = round1(Math.max(0, individualKm - consolidatedKm));
  const savedPercent = individualKm > 0 ? Math.round((savedKm / individualKm) * 1000) / 10 : 0;

  return {
    routes,
    totalKm: round1(consolidatedKm),
    individualKm,
    savedKm,
    savedPercent,
    method: "nearest-neighbour + 2-opt pickup tours into nearest FPO hub, one bulk line-haul per hub",
  };
}
