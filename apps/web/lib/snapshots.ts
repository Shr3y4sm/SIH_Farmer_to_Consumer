import type { QuoteSnapshot } from "@farmit/domain";

/**
 * Published quote snapshots, keyed by snapshot id. Demo-local in-memory store; the immutable
 * Supabase `quote_snapshots` table replaces it at pilot (see docs/DEPLOYMENT.md).
 * Escrow splits are always computed from these server-held snapshots — never from client payloads.
 */
const runtime = globalThis as typeof globalThis & { __farmitSnapshots?: Map<string, QuoteSnapshot> };
const snapshots = (runtime.__farmitSnapshots ??= new Map<string, QuoteSnapshot>());

export function saveSnapshot(snapshot: QuoteSnapshot): void {
  snapshots.set(snapshot.id, snapshot);
}

export function findSnapshot(id: string): QuoteSnapshot | null {
  return snapshots.get(id) ?? null;
}

export function findLatestSnapshotForLot(lotId: string): QuoteSnapshot | null {
  return [...snapshots.values()]
    .filter((snapshot) => snapshot.lotId === lotId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}
