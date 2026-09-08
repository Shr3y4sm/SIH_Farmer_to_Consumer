import { randomUUID } from "node:crypto";
import type { EscrowRecord, EscrowSplit, QuoteSnapshot } from "@farmit/domain";
import { findSnapshot } from "./snapshots";

/**
 * Simulated escrow (Phase 3, ADR-0009): hold on reservation → dispatch with a QR delivery code →
 * release on verified doorstep handshake. Demo-local in-memory store; at pilot this maps to a
 * payment-gateway escrow/split settlement — the record shape is the contract.
 */

const escrow = new Map<string, EscrowRecord>();

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Splits the immutable snapshot total across every party — the audit ledger rows. */
export function computeSplit(snapshot: QuoteSnapshot): EscrowSplit {
  return {
    farmer: snapshot.paddyPayout,
    miller: round2(snapshot.milling + snapshot.packagingQa),
    transporters: round2(snapshot.farmToMill + snapshot.lineHaul + snapshot.lastMile),
    platform: snapshot.platformCharge,
    tax: snapshot.tax,
  };
}

export function holdEscrow(quoteId: string): EscrowRecord | null {
  const existing = escrow.get(quoteId);
  if (existing) return existing; // idempotent
  const snapshot = findSnapshot(quoteId);
  if (!snapshot) return null;
  const record: EscrowRecord = {
    quoteId,
    lotId: snapshot.lotId,
    total: snapshot.total,
    status: "held",
    heldAt: new Date().toISOString(),
    dispatchedAt: null,
    releasedAt: null,
    deliveryCode: null,
    split: computeSplit(snapshot),
  };
  escrow.set(quoteId, record);
  return record;
}

export function dispatchEscrow(quoteId: string): EscrowRecord | null {
  const record = escrow.get(quoteId);
  if (!record || record.status !== "held") return null;
  record.status = "in_transit";
  record.dispatchedAt = new Date().toISOString();
  record.deliveryCode = `FARMIT-${randomUUID().slice(0, 8).toUpperCase()}`;
  return record;
}

export function releaseEscrow(quoteId: string, code: string): { record: EscrowRecord | null; error?: string } {
  const record = escrow.get(quoteId);
  if (!record) return { record: null, error: "No escrow is held for this snapshot. Publish a quote and reserve first." };
  if (record.status !== "in_transit" || !record.deliveryCode) {
    return { record: null, error: "Escrow can only be released after dispatch (in-transit with a delivery code)." };
  }
  if (code.trim().toUpperCase() !== record.deliveryCode) {
    return { record: null, error: "Delivery code mismatch — the QR handshake failed." };
  }
  record.status = "released";
  record.releasedAt = new Date().toISOString();
  return { record };
}

export function findEscrow(quoteId: string): EscrowRecord | null {
  return escrow.get(quoteId) ?? null;
}
