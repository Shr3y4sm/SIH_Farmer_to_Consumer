import type { QuoteSnapshot } from "@farmit/domain";

/**
 * Published quote snapshots, keyed by snapshot id. Demo-local in-memory store; the immutable
 * Supabase `quote_snapshots` table replaces it at pilot (see docs/DEPLOYMENT.md).
 * Escrow splits are always computed from these server-held snapshots — never from client payloads.
 */
const snapshots = new Map<string, QuoteSnapshot>();

export function saveSnapshot(snapshot: QuoteSnapshot): void {
  snapshots.set(snapshot.id, snapshot);
}

export function findSnapshot(id: string): QuoteSnapshot | null {
  return snapshots.get(id) ?? null;
}
