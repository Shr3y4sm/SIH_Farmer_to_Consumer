export function assertFloorPayout(value: number) {
  if (!Number.isFinite(value) || value < 24.41) {
    throw new Error("Floor payout must be at least the common-paddy MSP of ₹24.41/kg.");
  }
}

export function assertAvailableQuantity(value: number) {
  if (!Number.isFinite(value) || value < 29.85) {
    throw new Error("A 20 kg rice offer needs at least 29.85 kg of paddy at 67% yield.");
  }
}