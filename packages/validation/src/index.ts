export const MSP_FLOOR_PER_KG = 24.41;
export const MIN_PADDY_KG_FOR_20_RICE = 29.85;

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