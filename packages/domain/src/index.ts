export type Role = "farmer" | "operator" | "consumer";
export type OrderStatus = "reserved" | "milling" | "in_transit" | "delivered";

export type FarmLot = {
  id: string;
  farmerName: string;
  village: string;
  variety: "Sona Masuri";
  quantityKg: number;
  floorPayoutPerKg: number;
  harvestDate: string;
  qualityNote: string;
  latitude: number;
  longitude: number;
};

/** A farm lot annotated with its great-circle distance from the consumer hub. */
export type GeofenceLot = FarmLot & {
  distanceKm: number;
  withinGeofence: boolean;
};

/** A pickup/delivery hub the marketplace scans from. */
export type ConsumerLocation = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type QuoteInput = {
  millingPerKg: number;
  packagingQaPerKg: number;
  farmToMill: number;
  weeklyLineHaul: number;
  lastMile: number;
  taxRate: number;
  expiresInHours: number;
};

export type QuoteSnapshot = {
  id: string;
  lotId: string;
  createdAt: string;
  expiresAt: string;
  riceKg: number;
  paddyKg: number;
  yieldRate: number;
  paddyRate: number;
  paddyPayout: number;
  milling: number;
  packagingQa: number;
  farmToMill: number;
  lineHaul: number;
  lastMile: number;
  platformCharge: number;
  tax: number;
  total: number;
  weeklyRun: string;
};

export type Order = {
  id: string;
  quoteId: string;
  status: OrderStatus;
  consumerName: string;
  createdAt: string;
};

export type EscrowStatus = "held" | "in_transit" | "released";

/** Where every rupee of a released escrow goes — the live audit ledger. */
export type EscrowSplit = {
  farmer: number;
  miller: number;
  transporters: number;
  platform: number;
  tax: number;
};

export type EscrowRecord = {
  quoteId: string;
  lotId: string;
  total: number;
  status: EscrowStatus;
  heldAt: string;
  dispatchedAt: string | null;
  releasedAt: string | null;
  /** Secret inside the doorstep QR; required to release the split. */
  deliveryCode: string | null;
  /** Planned split while held; final once released. */
  split: EscrowSplit | null;
};