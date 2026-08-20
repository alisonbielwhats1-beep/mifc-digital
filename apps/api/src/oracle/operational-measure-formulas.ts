import { oracleDateKey } from "./layout-measure-formulas.js";

type OracleRow = Record<string, unknown>;

export interface OperationalMeasureResult {
  values: Record<string, number>;
  rows: Record<string, number>;
}

const asRows = (rows: unknown[] | undefined): OracleRow[] => (rows ?? []).filter(
  (row): row is OracleRow => Boolean(row) && typeof row === "object" && !Array.isArray(row),
);
const text = (row: OracleRow, key: string): string => String(row[key] ?? "").trim();
const numeric = (row: OracleRow, key: string): number => {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
};

function rowsForDate(rows: OracleRow[], contextDate: string, keys: string[]): OracleRow[] {
  return rows.filter((row) => {
    const populated = keys.filter((key) => row[key] !== null && row[key] !== undefined && String(row[key]).trim() !== "");
    if (!populated.length) return true;
    return populated.some((key) => oracleDateKey(row[key]) === contextDate);
  });
}

function productionRowsForDate(rows: OracleRow[], contextDate: string): OracleRow[] {
  const powerBiDateKeys = ["LOCATION_DATE", "Data_Processada", "DATA_PROCESSADA"];
  return rows.filter((row) => powerBiDateKeys.some((key) => {
    const value = row[key];
    return value !== null
      && value !== undefined
      && String(value).trim() !== ""
      && oracleDateKey(value) === contextDate;
  }));
}

function distinctCount(rows: OracleRow[], key: string): number {
  return new Set(rows.map((row) => text(row, key)).filter(Boolean)).size;
}

function productionAt(rows: OracleRow[], description: string): number {
  return distinctCount(rows.filter((row) => text(row, "DESCRIPTION") === description), "RAIL_ID");
}

function timestamp(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : value.valueOf();
  const parsed = Date.parse(String(value ?? ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function stopMinutes(row: OracleRow): number {
  const start = timestamp(row["PARADA"]);
  const end = timestamp(row["RETORNO"]);
  return start === null || end === null || end < start ? 0 : (end - start) / 60_000;
}

const scheduledCodes = new Set(["L9", "O3", "M6", "O2"]);
const operations: Record<string, string> = {
  "P-P-RF3": "ROLLFORMER 3",
  "P-P-B1": "BEATTY01",
  "P-P-B2": "BEATTY02",
  "P-P-B3": "BEATTY03",
  "P-P-B4": "BEATTY04",
  "P-P-P.A": "BEATTY PATIN",
  "P-P-CNC": "PLASMA 2 MANUAL",
  "P-P-LPP2": "PAINT LINE 02",
  "P-P-STJ": "STENHOJ O1",
};

function sumStops(rows: OracleRow[], operation: string, scheduledOnly: boolean): number {
  return rows
    .filter((row) => text(row, "OPERAÇÃO").toUpperCase() === operation)
    .filter((row) => !scheduledOnly || scheduledCodes.has(text(row, "CODIGO").toUpperCase()))
    .reduce((total, row) => total + stopMinutes(row), 0);
}

function punchCount(rows: OracleRow[]): number {
  const withChassis = rows.filter((row) => text(row, "CHASSIS_NUMBER"));
  return withChassis.reduce((total, row) => total + numeric(row, "ALMA"), 0)
    + rows.reduce((total, row) => total + numeric(row, "ALMA_BOTH"), 0) / 2;
}

export function deriveOperationalMeasures(input: {
  producao?: unknown[];
  paradas?: unknown[];
  lotes?: unknown[];
  punchScania?: unknown[];
  punchVolvo?: unknown[];
  lctStock?: unknown[];
  contextDate: string;
  demand: Record<string, number>;
}): OperationalMeasureResult {
  const producao = productionRowsForDate(asRows(input.producao), input.contextDate);
  const paradas = rowsForDate(asRows(input.paradas), input.contextDate, ["PARADA", "DATA", "DATE"]);
  const lotes = asRows(input.lotes);
  const punchScania = rowsForDate(asRows(input.punchScania), input.contextDate, ["DATA", "DATA_EMBARQUE"]);
  const punchVolvo = rowsForDate(asRows(input.punchVolvo), input.contextDate, ["DATA", "DATA_EMBARQUE"]);
  const lctStock = asRows(input.lctStock);

  const values: Record<string, number> = {
    "P-RF3": productionAt(producao, "Roll Former 3"),
    "P-B1": productionAt(producao, "Beatty Alma Output 1"),
    "P-B2": productionAt(producao, "Beatty Alma Output 2"),
    "P-B3": productionAt(producao, "Beatty Alma Output 3"),
    "P-B4": productionAt(producao, "Beatty Alma Output 4"),
    "P-P.A": productionAt(producao, "Beatty ABA Output"),
    "P-CNC": productionAt(producao, "Plasma CNC 02 Auto"),
    "P-LPP2": productionAt(producao, "Pintura Output 2"),
    "P-STJ": productionAt(producao, "Stenhoj"),
    "P-T": distinctCount(producao, "RAIL_ID"),
    "Q-P-T": distinctCount(paradas, "ID_PARADA"),
    "PT-RF3": sumStops(paradas, "ROLLFORMER 3", false),
    "C-T-E": lotes.reduce((total, row) => total + numeric(row, "MP(m)"), 0),
    "Q-S-E": lotes.filter((row) => text(row, "DESCRIPTION")).length,
    "P-S-T": lotes.reduce((total, row) => total + numeric(row, "PESO"), 0) / 1_000,
    "Q-G-SCA": punchCount(punchScania),
    "Q-G-VDB": punchCount(punchVolvo),
    "E-P-LCT": lctStock.reduce((total, row) => total + numeric(row, "TOTAL"), 0),
  };

  for (const [measure, operation] of Object.entries(operations)) values[measure] = sumStops(paradas, operation, true);
  values["DT-RF3"] = values["PT-RF3"] - values["P-P-RF3"];

  const remaining: Record<string, [string, string]> = {
    "P-R-RF3": ["D-P-RF3", "P-RF3"],
    "P-R-B1": ["D-P-B1", "P-B1"],
    "P-R-B2": ["D-P-B2", "P-B2"],
    "P-R-B3": ["D-P-B3", "P-B3"],
    "P-R-B4": ["D-P-B4", "P-B4"],
    "P-R-P.A": ["D-P-P.A", "P-P.A"],
    "P-R-CNC": ["D-P-CNC", "P-CNC"],
    "P-R-LPP2": ["D-P-LPP2", "P-LPP2"],
    "P-R-STJ": ["D-P-STJ", "P-STJ"],
  };
  for (const [measure, [demandKey, productionKey]] of Object.entries(remaining)) {
    values[measure] = (input.demand[demandKey] ?? 0) - values[productionKey];
  }

  return {
    values,
    rows: {
      producao: producao.length,
      paradas: paradas.length,
      lotes: lotes.length,
      "bi-punch-sca": punchScania.length,
      "bi-punch-vdb": punchVolvo.length,
      "bi-mifc-lct-pos-stock": lctStock.length,
    },
  };
}
