import { getCachedTable, getTableSyncStatus } from "./table-sync.js";
import { deriveLayoutDemandForDate, localDateKey } from "./layout-measure-formulas.js";
import { deriveOperationalMeasures } from "./operational-measure-formulas.js";

export function getCachedLayoutMeasures(contextDate = localDateKey()) {
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

  const { values: demand, diagnostics } = deriveLayoutDemandForDate(base1!.rows, base2!.rows, dafSlitters!.rows, contextDate);
  const operationalTables = {
    producao: getCachedTable("producao"),
    paradas: getCachedTable("paradas"),
    lotes: getCachedTable("lotes"),
    "bi-punch-sca": getCachedTable("bi-punch-sca"),
    "bi-punch-vdb": getCachedTable("bi-punch-vdb"),
    "bi-mifc-lct-pos-stock": getCachedTable("bi-mifc-lct-pos-stock"),
  };
  const operational = deriveOperationalMeasures({
    producao: operationalTables.producao?.rows,
    paradas: operationalTables.paradas?.rows,
    lotes: operationalTables.lotes?.rows,
    punchScania: operationalTables["bi-punch-sca"]?.rows,
    punchVolvo: operationalTables["bi-punch-vdb"]?.rows,
    lctStock: operationalTables["bi-mifc-lct-pos-stock"]?.rows,
    contextDate,
    demand,
  });
  const values = { ...demand, ...operational.values };
  const enrichedDiagnostics = {
    ...diagnostics,
    operationalRows: operational.rows,
    operationalReady: Object.fromEntries(Object.entries(operationalTables).map(([id, table]) => [id, Boolean(table)])),
  };
  const updatedAt = getTableSyncStatus().tables
    .filter((table) => ["base1", "base2", "daf-slitters"].includes(table.queryId))
    .map((table) => table.syncedAt)
    .sort()
    .at(-1) ?? null;
  return { ready: true as const, missing: [], values, diagnostics: enrichedDiagnostics, updatedAt };
}
