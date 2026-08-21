import { getCachedTable, getTableSyncStatus } from "./table-sync.js";
import { deriveLayoutDemandForDate, localDateKey } from "./layout-measure-formulas.js";
import { deriveLayoutStockMeasures } from "./layout-stock-measures.js";
import { deriveOperationalMeasures } from "./operational-measure-formulas.js";
import { getCachedShippingSchedule } from "../imports/shipping-schedule.js";

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
  const shippingSchedule = getCachedShippingSchedule();
  const operationalTables = {
    producao: getCachedTable("producao"),
    paradas: getCachedTable("paradas"),
    lotes: getCachedTable("lotes"),
    "bi-punch-sca": getCachedTable("bi-punch-sca"),
    "bi-punch-vdb": getCachedTable("bi-punch-vdb"),
    "bi-mifc-lct-pos-stock": getCachedTable("bi-mifc-lct-pos-stock"),
  };
  const stock = deriveLayoutStockMeasures({
    base1: base1!.rows,
    base2: base2!.rows,
    dafSlitters: dafSlitters!.rows,
    scania: getCachedTable("scania")?.rows,
    shippingSchedule: shippingSchedule?.rows,
    segregacao: getCachedTable("segregacao")?.rows,
    rf2: getCachedTable("relatorio-item-rf2")?.rows,
    lctStock: operationalTables["bi-mifc-lct-pos-stock"]?.rows,
    lotes: operationalTables.lotes?.rows,
    producao: operationalTables.producao?.rows,
    contextDate,
    demand,
  });
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
  const values = { ...demand, ...stock.values, ...operational.values };
  const enrichedDiagnostics = {
    ...diagnostics,
    operationalRows: operational.rows,
    stockRows: stock.rows,
    shippingSchedule: {
      ready: Boolean(shippingSchedule),
      source: shippingSchedule?.source ?? null,
      importedAt: shippingSchedule?.importedAt ?? null,
      rowCount: shippingSchedule?.rows.length ?? 0,
    },
    operationalReady: Object.fromEntries(Object.entries(operationalTables).map(([id, table]) => [id, Boolean(table)])),
  };
  const updatedAt = [
    ...getTableSyncStatus().tables
    .filter((table) => ["base1", "base2", "daf-slitters"].includes(table.queryId))
    .map((table) => table.syncedAt),
    ...(shippingSchedule ? [shippingSchedule.importedAt] : []),
  ]
    .sort()
    .at(-1) ?? null;
  return { ready: true as const, missing: [], values, diagnostics: enrichedDiagnostics, updatedAt };
}
