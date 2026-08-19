type OracleRow = Record<string, unknown>;

export interface LayoutDemandMeasures {
  "P-SCA-F": number;
  "P-DAF-S": number;
  "P-FH-F": number;
  "P-VM-F": number;
  "P-T-D": number;
  "D-P-RF3": number;
  "D-P-B1": number;
  "D-P-B2": number;
  "D-P-B3": number;
  "D-P-B4": number;
  "D-P-P.A": number;
  "D-P-CNC": number;
  "D-P-RF2": number;
  "D-P-LPP2": number;
  "D-P-STJ": number;
  "D-P-SCA-REB": number;
  "D-P-DAF-REB": number;
  "Q-D-E-VM": number;
  "P-M-VM": number;
}

export interface LayoutDemandDiagnostics {
  contextDate: string | null;
  todayDate: string;
  rows: Record<"base1" | "base2" | "daf-slitters", { cached: number; filtered: number }>;
}

export interface LayoutDemandResult {
  values: LayoutDemandMeasures;
  diagnostics: LayoutDemandDiagnostics;
}

const asRows = (rows: unknown[]): OracleRow[] => rows.filter((row): row is OracleRow => Boolean(row) && typeof row === "object" && !Array.isArray(row));
const hasValue = (value: unknown): boolean => value !== null && value !== undefined && String(value).trim() !== "";
const text = (row: OracleRow, key: string): string => String(row[key] ?? "").trim();
const number = (row: OracleRow, key: string): number => {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
};

const months: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", ABR: "04", MAY: "05", MAI: "05",
  JUN: "06", JUL: "07", AUG: "08", AGO: "08", SEP: "09", SET: "09", OCT: "10",
  OUT: "10", NOV: "11", DEC: "12", DEZ: "12",
};

export function localDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function oracleDateKey(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return localDateKey(value);
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const oracle = raw.toUpperCase().match(/^(\d{2})-([A-Z]{3})-(\d{4})/);
  if (oracle && months[oracle[2]]) return `${oracle[3]}-${months[oracle[2]]}-${oracle[1]}`;
  const brazilian = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brazilian) return `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}`;
  return null;
}

function rowsForDate(rows: OracleRow[], contextDate: string | null): OracleRow[] {
  return contextDate ? rows.filter((row) => oracleDateKey(row.SHIP_DATE) === contextDate) : rows;
}

export function base1Client(productClass: unknown): "FH" | "VM" | "SCA" | "B8" | "B13" | null {
  const value = String(productClass ?? "").trim();
  if (["NC", "NR", "WD"].includes(value)) return "SCA";
  if (value === "06") return "VM";
  if (["04", "24"].includes(value)) return "FH";
  if (value === "16") return "B8";
  if (value === "15") return "B13";
  return null;
}

export function deriveLayoutDemand(
  base1Rows: unknown[],
  base2Rows: unknown[],
  dafSlitterRows: unknown[],
): LayoutDemandMeasures {
  return deriveLayoutDemandForDate(base1Rows, base2Rows, dafSlitterRows, null).values;
}

export function deriveLayoutDemandForDate(
  base1Rows: unknown[],
  base2Rows: unknown[],
  dafSlitterRows: unknown[],
  contextDate: string | null,
  todayDate = localDateKey(),
): LayoutDemandResult {
  const cachedBase1 = asRows(base1Rows);
  const cachedBase2 = asRows(base2Rows);
  const cachedDafSlitters = asRows(dafSlitterRows);
  const base1 = rowsForDate(cachedBase1, contextDate);
  const base2 = rowsForDate(cachedBase2, contextDate);
  const dafSlitters = rowsForDate(cachedDafSlitters, contextDate);

  const fhItems = base1.filter((row) => base1Client(row.PRODUCT_CLASS) === "FH" && hasValue(row.CHASSIS_NUMBER)).length;
  const vmItems = base1.filter((row) => {
    const client = base1Client(row.PRODUCT_CLASS);
    return ["VM", "B13"].includes(client ?? "") && hasValue(row.CHASSIS_NUMBER);
  }).length;
  const scaniaComponents = base1.filter((row) => {
    const item = text(row, "ITEM");
    return text(row, "CUSTOMER_CODE") === "SCA"
      && (item.includes("1-") || item.includes("2-"))
      && hasValue(row.COMPONENT);
  }).length;
  const dafItems = base2.filter((row) => text(row, "CUSTOMER_CODE") === "DAF" && hasValue(row.ITEM)).length;

  const distinctSlitters = new Map<string, OracleRow>();
  for (const row of dafSlitters) {
    const job = text(row, "JOB_ORACLE");
    if (job && !distinctSlitters.has(job)) distinctSlitters.set(job, row);
  }
  const dafSlitterPairs = [...distinctSlitters.values()].reduce(
    (total, row) => total + (number(row, "QUANTITY_ORDERED") - number(row, "QUANTITY_FINISHED")) / 2,
    0,
  );
  const rf2Items = base1.filter((row) =>
    base1Client(row.PRODUCT_CLASS) === "FH"
    && ["4-MP600450SL411-0", "4-MP600760SL445-0"].includes(text(row, "MP"))
    && hasValue(row.CHASSIS_NUMBER),
  ).length;
  const vmFutureDates = new Set(cachedBase1
    .filter((row) => ["VM", "B13"].includes(base1Client(row.PRODUCT_CLASS) ?? ""))
    .map((row) => oracleDateKey(row.SHIP_DATE))
    .filter((date): date is string => date !== null)
    .filter((date) => date >= todayDate));

  const measures: LayoutDemandMeasures = {
    "P-SCA-F": scaniaComponents / 2,
    "P-DAF-S": dafItems / 2 + dafSlitterPairs,
    "P-FH-F": fhItems / 2,
    "P-VM-F": vmItems / 2,
    "P-T-D": 0,
    "D-P-RF3": 0,
    "D-P-B1": 0,
    "D-P-B2": 0,
    "D-P-B3": 0,
    "D-P-B4": 0,
    "D-P-P.A": 0,
    "D-P-CNC": 0,
    "D-P-RF2": rf2Items,
    "D-P-LPP2": 0,
    "D-P-STJ": 0,
    "D-P-SCA-REB": 0,
    "D-P-DAF-REB": 0,
    "Q-D-E-VM": vmFutureDates.size,
    "P-M-VM": 0,
  };
  measures["P-T-D"] = measures["P-SCA-F"] + measures["P-DAF-S"] + measures["P-FH-F"] + measures["P-VM-F"];
  measures["D-P-RF3"] = measures["P-T-D"] * 2;
  measures["D-P-B1"] = measures["P-VM-F"] * 2;
  measures["D-P-B2"] = measures["P-DAF-S"] * 2;
  measures["D-P-B3"] = measures["P-SCA-F"] * 2;
  measures["D-P-B4"] = measures["P-FH-F"] * 2;
  measures["D-P-P.A"] = (measures["P-FH-F"] + measures["P-SCA-F"]) * 2;
  measures["D-P-CNC"] = measures["P-DAF-S"] * 2;
  measures["D-P-LPP2"] = measures["P-T-D"] * 2;
  measures["D-P-STJ"] = (measures["P-SCA-F"] + measures["P-FH-F"] + measures["P-DAF-S"]) * 2;
  measures["D-P-SCA-REB"] = measures["P-SCA-F"] * 2;
  measures["D-P-DAF-REB"] = measures["P-DAF-S"] * 2;
  measures["P-M-VM"] = measures["Q-D-E-VM"] > 0 ? (measures["P-VM-F"] * 2) / measures["Q-D-E-VM"] : 0;
  return {
    values: measures,
    diagnostics: {
      contextDate,
      todayDate,
      rows: {
        base1: { cached: cachedBase1.length, filtered: base1.length },
        base2: { cached: cachedBase2.length, filtered: base2.length },
        "daf-slitters": { cached: cachedDafSlitters.length, filtered: dafSlitters.length },
      },
    },
  };
}
