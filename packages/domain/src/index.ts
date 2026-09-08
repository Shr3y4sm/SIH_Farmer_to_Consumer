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
};

export type QuoteInput = {
  millingPerKg: number;
  packagingQaPerKg: number;
  farmToMill: number;
  weeklyLineHaul: number;
  lastMile: number;
  platformCharge: number;
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