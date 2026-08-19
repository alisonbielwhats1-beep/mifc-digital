type OracleRow = Record<string, unknown>;

export interface Rf3DemandMeasures {
  "P-SCA-F": number;
  "P-DAF-S": number;
  "P-FH-F": number;
  "P-VM-F": number;
  "P-T-D": number;
  "D-P-RF3": number;
}

const asRows = (rows: unknown[]): OracleRow[] => rows.filter((row): row is OracleRow => Boolean(row) && typeof row === "object" && !Array.isArray(row));
const hasValue = (value: unknown): boolean => value !== null && value !== undefined && String(value).trim() !== "";
const text = (row: OracleRow, key: string): string => String(row[key] ?? "").trim();
const number = (row: OracleRow, key: string): number => {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
};

export function base1Client(productClass: unknown): "FH" | "VM" | "SCA" | "B8" | "B13" | null {
  const value = String(productClass ?? "").trim();
  if (["NC", "NR", "WD"].includes(value)) return "SCA";
  if (value === "06") return "VM";
  if (["04", "24"].includes(value)) return "FH";
  if (value === "16") return "B8";
  if (value === "15") return "B13";
  return null;
}

export function deriveRf3Demand(
  base1Rows: unknown[],
  base2Rows: unknown[],
  dafSlitterRows: unknown[],
): Rf3DemandMeasures {
  const base1 = asRows(base1Rows);
  const base2 = asRows(base2Rows);
  const dafSlitters = asRows(dafSlitterRows);

  const fhItems = base1.filter((row) => base1Client(row.PRODUCT_CLASS) === "FH" && hasValue(row.CHASSIS_NUMBER)).length;
  const vmItems = base1.filter((row) => {
    const client = base1Client(row.PRODUCT_CLASS);
    return !["FH", "SCA", "B8"].includes(client ?? "") && hasValue(row.CHASSIS_NUMBER);
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

  const measures: Rf3DemandMeasures = {
    "P-SCA-F": scaniaComponents / 2,
    "P-DAF-S": dafItems / 2 + dafSlitterPairs,
    "P-FH-F": fhItems / 2,
    "P-VM-F": vmItems / 2,
    "P-T-D": 0,
    "D-P-RF3": 0,
  };
  measures["P-T-D"] = measures["P-SCA-F"] + measures["P-DAF-S"] + measures["P-FH-F"] + measures["P-VM-F"];
  measures["D-P-RF3"] = measures["P-T-D"] * 2;
  return measures;
}
