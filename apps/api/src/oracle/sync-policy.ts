import type { QueryCatalogEntry } from "./query-catalog.js";

export interface TableDelta {
  added: number;
  removed: number;
  unchanged: number;
  changed: boolean;
}

export function selectSyncCandidates(catalog: QueryCatalogEntry[]): QueryCatalogEntry[] {
  return catalog.filter((entry) => entry.enabled && entry.queryMode === "embedded-sql" && entry.usedBy.length > 0);
}

export function reachedRowLimit(rowCount: number, maxRows?: number): boolean {
  return Boolean(maxRows && rowCount >= maxRows);
}

function stableRow(row: unknown): string {
  if (!row || typeof row !== "object" || Array.isArray(row)) return JSON.stringify(row);
  const record = row as Record<string, unknown>;
  return JSON.stringify(Object.keys(record).sort().map((key) => [key, record[key]]));
}

export function calculateTableDelta(previousRows: unknown[], currentRows: unknown[]): TableDelta {
  const previous = new Map<string, number>();
  const current = new Map<string, number>();
  for (const row of previousRows) {
    const signature = stableRow(row);
    previous.set(signature, (previous.get(signature) ?? 0) + 1);
  }
  for (const row of currentRows) {
    const signature = stableRow(row);
    current.set(signature, (current.get(signature) ?? 0) + 1);
  }

  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const signature of new Set([...previous.keys(), ...current.keys()])) {
    const before = previous.get(signature) ?? 0;
    const after = current.get(signature) ?? 0;
    unchanged += Math.min(before, after);
    added += Math.max(0, after - before);
    removed += Math.max(0, before - after);
  }
  return { added, removed, unchanged, changed: added > 0 || removed > 0 };
}
