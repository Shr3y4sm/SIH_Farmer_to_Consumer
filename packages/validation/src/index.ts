export const MSP_FLOOR_PER_KG = 24.41;
export const MIN_PADDY_KG_FOR_20_RICE = 29.85;

export type QuoteInputValues = {
  millingPerKg: number;
  packagingQaPerKg: number;
  farmToMill: number;
  weeklyLineHaul: number;
  lastMile: number;
  /** Decimal fraction: 0.05 means 5%. */
  taxRate: number;
  expiresInHours: number;
};

export function assertFloorPayout(value: number) {
  if (!Number.isFinite(value) || value < MSP_FLOOR_PER_KG) {
    throw new Error("Floor payout must be at least the common-paddy MSP of ₹24.41/kg.");
  }
}

export function assertAvailableQuantity(value: number) {
  if (!Number.isFinite(value) || value < MIN_PADDY_KG_FOR_20_RICE) {
    throw new Error("A 20 kg rice offer needs at least 29.85 kg of paddy at 67% yield.");
  }
}

export function assertCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be a number between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be a number between -180 and 180.");
  }
}

export function assertQuoteInput(input: QuoteInputValues) {
  const costs = [input.millingPerKg, input.packagingQaPerKg, input.farmToMill, input.weeklyLineHaul, input.lastMile];
  if (!costs.every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("All milling, quality and transport costs must be non-negative numbers.");
  }
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 1) {
    throw new Error("GST rate must be between 0% and 100%.");
  }
  if (!Number.isFinite(input.expiresInHours) || input.expiresInHours <= 0 || input.expiresInHours > 168) {
    throw new Error("Snapshot validity must be between 1 and 168 hours.");
  }
}
