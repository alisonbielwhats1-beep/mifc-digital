import type { QueryCatalogEntry } from "./query-catalog.js";

export function selectSyncCandidates(catalog: QueryCatalogEntry[]): QueryCatalogEntry[] {
  return catalog.filter((entry) => entry.enabled && entry.queryMode === "embedded-sql" && entry.usedBy.length > 0);
}
