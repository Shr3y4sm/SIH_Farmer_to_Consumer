import type { ConsumerLocation, FarmLot } from "@farmit/domain";

/** Hubs the geofence scan runs from. Jayanagar is the demo's delivery neighbourhood. */
export const CONSUMER_HUBS: ConsumerLocation[] = [
  { id: "hub_jayanagar", label: "Jayanagar, Bengaluru", latitude: 12.9308, longitude: 77.5838 },
  { id: "hub_indiranagar", label: "Indiranagar, Bengaluru", latitude: 12.9784, longitude: 77.6408 },
];

/** Coordinates are approximate village centroids, labelled illustrative demo data in the UI. */
const seedLots: FarmLot[] = [
  { id: "lot_tumkur_01", farmerName: "Shivanna", village: "Huliyurdurga, Tumkur", variety: "Sona Masuri", quantityKg: 680, floorPayoutPerKg: 24.41, harvestDate: "2026-09-02", qualityNote: "Clean grain · 13% moisture · locally harvested", latitude: 12.95, longitude: 76.9 },
  { id: "lot_tumkur_02", farmerName: "Lakshmamma", village: "Kunigal, Tumkur", variety: "Sona Masuri", quantityKg: 540, floorPayoutPerKg: 24.9, harvestDate: "2026-09-04", qualityNote: "Freshly threshed · sun-dried · single-plot lot", latitude: 13.02, longitude: 77.03 },
  { id: "lot_tumkur_03", farmerName: "Ramesh Naik", village: "Gubbi, Tumkur", variety: "Sona Masuri", quantityKg: 900, floorPayoutPerKg: 25.4, harvestDate: "2026-09-01", qualityNote: "Organic plot · 12.5% moisture · FPO verified", latitude: 13.36, longitude: 76.94 },
  { id: "lot_tumkur_04", farmerName: "Manjula", village: "Koratagere, Tumkur", variety: "Sona Masuri", quantityKg: 430, floorPayoutPerKg: 24.75, harvestDate: "2026-09-06", qualityNote: "Family farm · hand-weeded · no dryers used", latitude: 13.19, longitude: 77.05 },
  { id: "lot_tumkur_05", farmerName: "Basavaraj", village: "Madhugiri, Tumkur", variety: "Sona Masuri", quantityKg: 1100, floorPayoutPerKg: 24.6, harvestDate: "2026-08-30", qualityNote: "Bulk lot · mill-ready · 13% moisture", latitude: 13.66, longitude: 77.21 },
  { id: "lot_ram_01", farmerName: "Chikkamma", village: "Magadi, Ramanagara", variety: "Sona Masuri", quantityKg: 380, floorPayoutPerKg: 25.1, harvestDate: "2026-09-05", qualityNote: "Terrace paddy · small batch · chemical-free", latitude: 12.97, longitude: 77.23 },
  { id: "lot_ram_02", farmerName: "Sowbhagya", village: "Channapatna, Ramanagara", variety: "Sona Masuri", quantityKg: 490, floorPayoutPerKg: 24.7, harvestDate: "2026-09-03", qualityNote: "Clean grain · 12.8% moisture · woman-led FPO", latitude: 12.65, longitude: 77.21 },
  { id: "lot_ram_03", farmerName: "Thimmaraju", village: "Kanakapura, Ramanagara", variety: "Sona Masuri", quantityKg: 760, floorPayoutPerKg: 24.45, harvestDate: "2026-09-02", qualityNote: "River-irrigated · freshly harvested", latitude: 12.55, longitude: 77.21 },
  { id: "lot_blr_01", farmerName: "Prakash", village: "Nelamangala, Bengaluru Rural", variety: "Sona Masuri", quantityKg: 720, floorPayoutPerKg: 24.55, harvestDate: "2026-09-07", qualityNote: "Closest to the city hub · low food miles", latitude: 13.1, longitude: 77.39 },
  { id: "lot_blr_02", farmerName: "Muniraju", village: "Doddaballapur, Bengaluru Rural", variety: "Sona Masuri", quantityKg: 850, floorPayoutPerKg: 24.8, harvestDate: "2026-09-04", qualityNote: "Cooperative lot · uniform grain size", latitude: 13.29, longitude: 77.54 },
  { id: "lot_blr_03", farmerName: "Venkatesh", village: "Devanahalli, Bengaluru Rural", variety: "Sona Masuri", quantityKg: 610, floorPayoutPerKg: 25.2, harvestDate: "2026-09-01", qualityNote: "Organic certified · 12.6% moisture", latitude: 13.24, longitude: 77.71 },
  { id: "lot_out_01", farmerName: "Hanumanthappa", village: "Sira, Tumkur", variety: "Sona Masuri", quantityKg: 1250, floorPayoutPerKg: 24.5, harvestDate: "2026-08-29", qualityNote: "Bulk lot · outside the 100 km sourcing ring", latitude: 13.74, longitude: 76.9 },
  { id: "lot_out_02", farmerName: "Jayamma", village: "Pavagada, Tumkur", variety: "Sona Masuri", quantityKg: 1000, floorPayoutPerKg: 24.65, harvestDate: "2026-08-31", qualityNote: "Solar-park region · outside the 100 km ring", latitude: 14.1, longitude: 77.28 },
  { id: "lot_out_03", farmerName: "Nagaraj", village: "Tiptur, Tumkur", variety: "Sona Masuri", quantityKg: 980, floorPayoutPerKg: 25.0, harvestDate: "2026-09-03", qualityNote: "Coconut-belt farm · outside the 100 km ring", latitude: 13.26, longitude: 76.48 },
];

/**
 * Demo-local catalog. Keep the array on globalThis so Next's development
 * hot-reload can re-evaluate this module without wiping lots that were just
 * added through the farmer form. Supabase farm_lots replaces this when the
 * pilot connects.
 */
const runtime = globalThis as typeof globalThis & { __farmitCatalog?: FarmLot[] };
const catalog = (runtime.__farmitCatalog ??= [...seedLots]);

export function listLots(): FarmLot[] {
  return catalog;
}

export function findLot(id: string): FarmLot | null {
  return catalog.find((lot) => lot.id === id) ?? null;
}

export function addLot(lot: FarmLot): FarmLot {
  catalog.push(lot);
  return lot;
}

export function nextLotId(): string {
  return `lot_${Date.now().toString(36)}`;
}
