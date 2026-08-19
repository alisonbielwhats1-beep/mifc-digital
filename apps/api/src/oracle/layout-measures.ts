import { getCachedTable, getTableSyncStatus } from "./table-sync.js";
import { deriveLayoutDemand } from "./layout-measure-formulas.js";

export function getCachedLayoutMeasures() {
  const base1 = getCachedTable("base1");
  const base2 = getCachedTable("base2");
  const dafSlitters = getCachedTable("daf-slitters");
  const missing = [
    ["base1", base1],
    ["base2", base2],
    ["daf-slitters", dafSlitters],
  ].filter(([, result]) => !result).map(([id]) => id);

  if (missing.length) {
    return { ready: false as const, missing, values: null, updatedAt: null };
  }

  const values = deriveLayoutDemand(base1!.rows, base2!.rows, dafSlitters!.rows);
  const updatedAt = getTableSyncStatus().tables
    .filter((table) => ["base1", "base2", "daf-slitters"].includes(table.queryId))
    .map((table) => table.syncedAt)
    .sort()
    .at(-1) ?? null;
  return { ready: true as const, missing: [], values, updatedAt };
}
