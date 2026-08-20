import { base1Client, localDateKey, oracleDateKey } from "./layout-measure-formulas.js";

type OracleRow = Record<string, unknown>;

export interface LayoutStockMeasureInput {
  base1?: unknown[];
  base2?: unknown[];
  dafSlitters?: unknown[];
  scania?: unknown[];
  shippingSchedule?: unknown[];
  segregacao?: unknown[];
  rf2?: unknown[];
  lctStock?: unknown[];
  lotes?: unknown[];
  producao?: unknown[];
  contextDate: string;
  todayDate?: string;
  demand: Record<string, number>;
}

export interface LayoutStockMeasureResult {
  values: Record<string, number>;
  rows: Record<string, number>;
}

const rows = (input: unknown[] | undefined): OracleRow[] => (input ?? []).filter(
  (row): row is OracleRow => Boolean(row) && typeof row === "object" && !Array.isArray(row),
);
const text = (row: OracleRow, ...keys: string[]): string => {
  for (const key of keys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }
  return "";
};
const numeric = (row: OracleRow, ...keys: string[]): number => {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
};
const hasValue = (row: OracleRow, ...keys: string[]): boolean => text(row, ...keys) !== "";
const key = (value: string): string => value.trim().toLocaleLowerCase("pt-BR");

function rowsForDate(input: unknown[] | undefined, contextDate: string, dateKeys: string[]): OracleRow[] {
  return rows(input).filter((row) => {
    const populated = dateKeys.filter((dateKey) => hasValue(row, dateKey));
    if (!populated.length) return true;
    return populated.some((dateKey) => oracleDateKey(row[dateKey]) === contextDate);
  });
}

function sourceLocal(row: OracleRow): string {
  return text(row, "localName", "local", "Local", "LOCATION", "location");
}

function canonicalLocal(value: string): string {
  const normalized = key(value);
  if (["beatty output", "beatty alma output 1", "beatty alma output 2", "beatty alma output 3", "beatty alma output 4"].includes(normalized)) return "Beatty Output";
  if (normalized === "pintura input 2") return "Pintura Input 2";
  if (normalized === "pintura output 2") return "Pintura Output 2";
  if (["plasma 03 auto", "plasma cnc 02 auto", "mesa 04", "marking vin output", "marking vin input"].includes(normalized)) return "Cantilever";
  if (["embalaje 1", "embalaje 3", "estoque fg"].includes(normalized)) return "Estoque FG";
  if (normalized === "roll former 3 output") return "Roll Former 3";
  if (normalized === "stenhoj") return "Stenhoj";
  if (normalized === "rebitagem") return "Rebitagem";
  if (normalized === "p.a output" || normalized === "beatty aba output" || normalized === "beatty aba input") return "P.A Output";
  if (normalized === "buffer p.a - b3 e b4") return "Buffer P.A - B3 e B4";
  if (normalized === "buffer p.a") return "Buffer P.A";
  if (normalized === "ag. stenhøj" || normalized === "ag. stenhoj") return "Ag. Stenhøj";
  if (normalized === "ag. emb1") return "Ag. Emb1";
  if (normalized === "ag. emb3") return "Ag. Emb3";
  if (normalized === "mtg - reb") return " MTG - REB";
  if (normalized === "rollformer 2") return "Rollformer 2";
  return value.trim();
}

/** Reproduz integralmente a coluna Base1[local] do Power Query, inclusive o `else "Slitter"`. */
function base1PowerBiLocal(row: OracleRow): string {
  const alreadyTransformed = text(row, "localName", "local", "Local");
  if (alreadyTransformed) return canonicalLocal(alreadyTransformed);

  const source = key(text(row, "LOCATION", "location"));
  const mapped: Record<string, string> = {
    [key("Estoque FG")]: "Estoque FG",
    [key("Beatty Output")]: "Beatty Output",
    [key("Cantilever")]: "Cantilever",
    [key("P.A Output")]: "P.A Output",
    [key("Buffer P.A - B3 e B4")]: "Buffer P.A - B3 e B4",
    [key("Buffer P.A")]: "Buffer P.A",
    [key("Ag. Stenhøj")]: "Ag. Stenhøj",
    [key("Ag. Emb1")]: "Ag. Emb1",
    [key("Ag. Emb3")]: "Ag. Emb3",
    [key("MTG - REB")]: " MTG - REB",
    [key("Slitter")]: "Slitter",
    [key("Embalaje 1")]: "Estoque FG",
    [key("Embalaje 3")]: "Estoque FG",
    [key("Stenhoj")]: "Stenhoj",
    [key("Rebitagem")]: "Rebitagem",
    [key("Beatty Alma Output 1")]: "Beatty Output",
    [key("Beatty Alma Output 2")]: "Beatty Output",
    [key("Beatty Alma Input 1")]: "Beatty Output",
    [key("Beatty Alma Input 2")]: "Beatty Output",
    [key("Pintura Output 2")]: "Pintura Output 2",
    [key("Pintura Input 2")]: "Pintura Input 2",
    [key("Plasma 03 Auto")]: "Cantilever",
    [key("Plasma CNC 02 Auto")]: "Cantilever",
    [key("Mesa 04")]: "Cantilever",
    [key("Marking VIN Output")]: "Cantilever",
    [key("Marking VIN Input")]: "Cantilever",
    [key("Beatty ABA Output")]: "P.A Output",
    [key("Beatty ABA Input")]: "P.A Output",
    [key("Beatty Alma Output 3")]: "Buffer P.A - B3 e B4",
    [key("Beatty Alma Output 4")]: "Buffer P.A - B3 e B4",
    [key("Beatty Alma Input 3")]: "Buffer P.A - B3 e B4",
    [key("Yoke Punch 3")]: "Buffer P.A - B3 e B4",
    [key("Beatty Alma Input 4")]: "Buffer P.A",
    [key("Roll Former 3")]: "Roll Former 3",
    [key("Roll Former 3 Output")]: "Roll Former 3",
    [key("Roll Former 3 Input")]: "Slitter",
  };
  return mapped[source] ?? "Slitter";
}

function base1Local(row: OracleRow, client: "FH" | "VM" | "SCA"): string {
  const location = base1PowerBiLocal(row);
  const item = text(row, "ITEM");
  if (client === "FH") {
    if (key(location) === "pintura output 2") return "Ag. Stenhøj";
    if (key(location) === "stenhoj") return "Ag. Emb1";
  }
  if (client === "VM") {
    if (key(location) === "pintura output 2") return "Ag. Emb3";
  }
  if (client === "SCA") {
    if (item.includes("2-")) {
      if (key(location) === "pintura output 2") return " MTG - REB";
      if (key(location) === "rebitagem") return "Ag. Stenhøj";
      if (key(location) === "stenhoj") return "Ag. Emb1";
    }
    if (key(location) === "pintura output 2") return "Ag. Stenhøj";
  }
  return location;
}

function clientFromBase1(row: OracleRow): "FH" | "VM" | "SCA" | null {
  const explicit = text(row, "Clientes", "CLIENTES");
  if (explicit === "FH" || explicit === "VM" || explicit === "SCA") return explicit;
  const classified = base1Client(text(row, "PRODUCT_CLASS", "product_class"));
  return classified === "FH" || classified === "VM" || classified === "SCA" ? classified : null;
}

function isScaniaRail(row: OracleRow): boolean {
  const item = text(row, "ITEM");
  const tipo = key(text(row, "TIPO", "Tipo"));
  if (tipo.includes("conjunto") || item.startsWith("1-F")) return false;
  return tipo.includes("longarina") || tipo.includes("reforço") || item.includes("1-") || item.includes("2-");
}

function scaniaPieceUnit(row: OracleRow): number {
  if (!isScaniaRail(row)) return 0;
  if (text(row, "QTD LONG REF", "QTD long SIMPLES", "QTD REF")) {
    return numeric(row, "QTD LONG REF") + numeric(row, "QTD long SIMPLES") + numeric(row, "QTD REF");
  }
  const local = canonicalLocal(sourceLocal(row));
  const tipo = key(text(row, "TIPO", "Tipo"));
  if (tipo.includes("reforço") && key(local) === key("Ag. Stenhøj")) return 0;
  return 1;
}

const dafReinforcedItems = new Set([
  "1-2159711-00", "1-2159712-00", "1-2193601-01", "1-2193602-01", "1-2193603-01", "1-2193604-01",
  "1-2193611-02", "1-2193612-02", "1-2193613-02", "1-2193614-02", "1-2295253-00", "1-2295253-01",
  "1-2295254-00", "1-2295254-01", "1-2295255-00", "1-2295256-00", "1-2307051-00", "1-2307052-00",
  "1-2307057-00", "1-2307058-00", "1-2307059-00", "1-2307060-00", "1-2307061-00", "1-2307061-01",
  "1-2307062-00", "1-2307062-01", "1-2340873-02", "1-2340873-03", "1-2340874-02", "1-2340874-03",
  "1-2340882-02", "1-2340883-02", "1-2386890-00", "1-2386891-00", "1-2391399-00", "1-2391400-00",
  "1-2401743-00", "1-2401744-00", "1-2407324-00", "1-2407324-01", "1-2407325-00", "1-2407325-01",
  "1-2414598-00", "1-2414599-00", "1-2422369-00", "1-2422370-00", "1-2440060-00", "1-2440061-00",
]);

const dafSimpleItems = new Set([
  "1-2184071-02", "1-2184071-06", "1-2184072-02", "1-2184072-06", "1-2340888-02", "1-2340889-02",
  "1-2340892-02", "1-2340893-02", "1-2340898-02", "1-2340899-02", "1-2341030-03", "1-2341030-04", "1-2341031-03",
  "1-2341031-04", "1-2342621-02", "1-2342622-02", "1-2342631-02", "1-2342632-02", "1-2407324-00",
  "1-2407324-01", "1-2407325-00", "1-2407325-01", "1-2407330-00", "1-2407330-01", "1-2407331-00",
  "1-2407331-01", "1-2414609-00", "1-2414610-00", "1-2418272-00", "1-2418273-00", "1-2422369-00",
  "1-2422370-00", "1-2422375-00", "1-2422376-00", "1-2440318-00", "1-2440319-00",
]);

function normalizedDafItem(item: string): string {
  return item.replace(/#\(tab\)/g, "").trim();
}

function dafLocal(row: OracleRow, variant: "original" | "simple" | "reinforced" = "reinforced"): string {
  const local = canonicalLocal(sourceLocal(row));
  if (variant === "simple" && key(local) === key("pintura output 2")) return "Ag. Stenhøj";
  if (variant === "reinforced" && key(local) === key("pintura output 2")) return " MTG - REB";
  if (key(local) === key("stenhoj")) return "Ag. Emb1";
  if (key(local) === key("rebitagem")) return "Ag. Stenhøj";
  return local;
}

function derivedDafRows(input: OracleRow[]): OracleRow[] {
  return input.flatMap((row) => {
    const item = normalizedDafItem(text(row, "ITEM"));
    const derived: OracleRow[] = [{ ...row, localName: dafLocal(row, "original") }];
    if (dafSimpleItems.has(item)) derived.push({ ...row, localName: dafLocal(row, "simple") });
    if (!dafSimpleItems.has(item) || dafReinforcedItems.has(item)) derived.push({ ...row, localName: dafLocal(row, "reinforced") });
    return derived;
  });
}

function dafPieceUnit(row: OracleRow): number {
  const description = key(text(row, "RAIL_TYPE_DESCRIPTION", "RAIL_TYPE_DESCRIPTION "));
  const local = canonicalLocal(sourceLocal(row));
  if (description.includes("longarina")) return 1;
  if (description.includes("reforço") || description.includes("reforco")) return key(local) === key("Ag. Stenhøj") ? 0 : 1;
  const item = text(row, "ITEM");
  return item.startsWith("1-") ? 1 : 0;
}

function distinct(rowsToCount: OracleRow[], ...keys: string[]): number {
  return new Set(rowsToCount.map((row) => text(row, ...keys)).filter(Boolean)).size;
}

function safeDivide(value: number, divisor: number): number {
  return Number.isFinite(value) && Number.isFinite(divisor) && divisor !== 0 ? value / divisor : 0;
}

function positiveNumber(row: OracleRow, ...keys: string[]): number | undefined {
  for (const column of keys) {
    const value = Number(row[column]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

/** Reproduz a coluna calculada DAX Lotes[MP(m)]. */
function lotLengthMeters(row: OracleRow): number | undefined {
  const calculated = positiveNumber(row, "MP(m)", "MP_M", "MP(metros)");
  if (calculated !== undefined) return calculated;
  const weightKg = positiveNumber(row, "PESO");
  const thicknessMm = positiveNumber(row, "ESPESSURA");
  const widthMm = positiveNumber(row, "LARGURA");
  if (weightKg === undefined || thicknessMm === undefined || widthMm === undefined) return undefined;
  return (weightKg / 7850) / ((thicknessMm / 1000) * (widthMm / 1000));
}

function finishLengthMeters(row: OracleRow): number | undefined {
  return positiveNumber(row, "FINISH_LENGHT", "FINISH_LENGTH");
}

function isSlitterLengthRow(row: OracleRow): boolean {
  return key(base1PowerBiLocal(row)) === key("Slitter");
}

type LotClientGroup = "VDB" | "SCA" | "DAF";

function normalizedLotClient(value: string): LotClientGroup | undefined {
  const suffix = value.trim().toUpperCase().slice(-3);
  if (suffix === "VDB" || suffix === "SCA" || suffix === "DAF") return suffix;
  if (suffix === "FH" || suffix === "VM") return "VDB";
  return undefined;
}

function clientPairs(rowsToCount: OracleRow[], client: "FH" | "VM" | "SCA" | "DAF"): number {
  if (client === "FH" || client === "VM") return rowsToCount.filter((row) => hasValue(row, "CHASSIS_NUMBER")).length / 2;
  if (client === "SCA") return rowsToCount.reduce((total, row) => total + scaniaPieceUnit(row), 0) / 2;
  return rowsToCount.reduce((total, row) => total + dafPieceUnit(row), 0) / 2;
}

function localPairs(rowsToCount: OracleRow[], client: "FH" | "VM" | "SCA" | "DAF", localName: string): number {
  const filtered = rowsToCount.filter((row) => key(row.localName as string ?? "") === key(localName));
  return clientPairs(filtered, client);
}

function futureDays(rowsToCount: OracleRow[], todayDate: string): number {
  return new Set(rowsToCount
    .map((row) => oracleDateKey(row.SHIP_DATE))
    .filter((date): date is string => date !== null && date >= todayDate)).size;
}

function rate(pairs: number, days: number): number {
  return safeDivide(pairs * 2, days);
}

function stockDays(stockPairs: number, clientRate: number, factor: number): number {
  return safeDivide(stockPairs * factor, clientRate);
}

function segregationClient(row: OracleRow): string {
  const explicit = text(row, "Cliente", "CLIENTE");
  if (explicit) return explicit;
  const customer = text(row, "CUSTOMER_CODE", "customer_code");
  if (customer) return customer;
  const location = key(text(row, "LOCATION", "location"));
  if (location === "rollformer 2") return "FH";
  if (location === "roll former 3") return "FH-VM/RF3";
  return "";
}

function segregationCount(input: OracleRow[], client: string): number {
  return distinct(input.filter((row) => key(segregationClient(row)) === key(client)), "RAIL_ID", "CHASSIS_NUMBER");
}

function segregationBy(input: OracleRow[], enn: string, locations: string[], client?: string, excludeReasons: string[] = []): number {
  return distinct(input.filter((row) => (!client || key(segregationClient(row)) === key(client))
    && key(text(row, "Processos e ENNs.ENN", "ENN")) === key(enn)
    && locations.map(key).includes(key(text(row, "LOCATION", "location")))
    && !excludeReasons.map(key).includes(key(text(row, "MOTIVO", "motivo")))), "RAIL_ID", "CHASSIS_NUMBER");
}

type LayoutClient = "FH" | "VM" | "SCA" | "DAF";

function relationshipValue(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

export function shippingRelationshipKey(row: OracleRow, client: LayoutClient): string | null {
  const shipDate = oracleDateKey(row.SHIP_DATE ?? row.Data ?? row.DATA);
  if (client === "DAF") return shipDate ? relationshipValue(shipDate) : null;
  if (client === "SCA") {
    const platform = text(row, "PLATAFORMA", "Plataforma");
    if (platform) return relationshipValue(platform);
  }
  const flatbed = text(row, "FLATBED", "Flatbed");
  if (!shipDate || !flatbed) return null;
  const customer = text(row, "CUSTOMER_CODE", "customer_code")
    .replaceAll("VDB", "VDBCL") || client;
  return relationshipValue(`${customer}_${shipDate.slice(2).replaceAll("-", "")}_${flatbed}`);
}

function futureScheduleKeys(input: unknown[] | undefined, todayDate: string): Set<string> {
  return new Set(rows(input)
    .filter((row) => {
      const date = oracleDateKey(row.Data ?? row.DATA);
      return date !== null && date >= todayDate;
    })
    .map((row) => relationshipValue(row.relationshipKey ?? row.Flatbed))
    .filter(Boolean));
}

function rowsRelatedToSchedule(
  input: OracleRow[],
  client: LayoutClient,
  scheduleKeys: Set<string>,
  allowedLocals?: string[],
): OracleRow[] {
  const localKeys = allowedLocals?.map(key);
  return input.filter((row) => {
    if (localKeys && !localKeys.includes(key(String(row.localName ?? "")))) return false;
    const relationship = shippingRelationshipKey(row, client);
    return relationship !== null && scheduleKeys.has(relationship);
  });
}

export function deriveLayoutStockMeasures(input: LayoutStockMeasureInput): LayoutStockMeasureResult {
  const todayDate = input.todayDate ?? localDateKey();
  const base1 = rowsForDate(input.base1, input.contextDate, ["SHIP_DATE"]);
  const base2 = rowsForDate(input.base2, input.contextDate, ["SHIP_DATE"]);
  const scaniaFallback = rowsForDate(input.scania, input.contextDate, ["SHIP_DATE"]);
  const segregation = rowsForDate(input.segregacao, input.contextDate, ["DATA", "DATA SEGREGAÇÃO", "DATE"]);
  const rf2 = rowsForDate(input.rf2, input.contextDate, ["Data", "Data de fabricação", "DATE"]);
  const lctStock = rowsForDate(input.lctStock, input.contextDate, ["DATA", "Data", "DATE"]);

  const allBase1 = rows(input.base1);
  const allBase2 = rows(input.base2);
  const allScaniaFallback = rows(input.scania);
  const fh = base1.filter((row) => clientFromBase1(row) === "FH" && hasValue(row, "CHASSIS_NUMBER")).map((row) => ({ ...row, localName: base1Local(row, "FH") }));
  const vm = base1.filter((row) => clientFromBase1(row) === "VM" && hasValue(row, "CHASSIS_NUMBER")).map((row) => ({ ...row, localName: base1Local(row, "VM") }));
  const hasDedicatedScania = input.scania !== undefined;
  const scaniaSource = hasDedicatedScania
    ? scaniaFallback
    : base1.filter((row) => clientFromBase1(row) === "SCA" && (text(row, "ITEM").includes("1-") || text(row, "ITEM").includes("2-")));
  const scania = scaniaSource.map((row) => ({ ...row, localName: hasDedicatedScania ? canonicalLocal(sourceLocal(row)) : base1Local(row, "SCA") }));
  const dafBase = base2.filter((row) => text(row, "CUSTOMER_CODE", "customer_code") === "DAF"
    && text(row, "DESCRIPTION") !== "BEATTY 2"
    && key(sourceLocal(row)) !== key("Slitter")
    && key(text(row, "LOCATION", "location")) !== key("Roll Former 3 Input"));
  const daf = derivedDafRows(dafBase);

  const fhAll = allBase1.filter((row) => clientFromBase1(row) === "FH" && hasValue(row, "CHASSIS_NUMBER")).map((row) => ({ ...row, localName: base1Local(row, "FH") }));
  const vmAll = allBase1.filter((row) => clientFromBase1(row) === "VM" && hasValue(row, "CHASSIS_NUMBER")).map((row) => ({ ...row, localName: base1Local(row, "VM") }));
  const scaniaAll = (hasDedicatedScania
    ? allScaniaFallback
    : allBase1.filter((row) => clientFromBase1(row) === "SCA" && (text(row, "ITEM").includes("1-") || text(row, "ITEM").includes("2-"))))
    .map((row) => ({ ...row, localName: hasDedicatedScania ? canonicalLocal(sourceLocal(row)) : base1Local(row, "SCA") }));
  const dafAllBase = allBase2.filter((row) => text(row, "CUSTOMER_CODE", "customer_code") === "DAF"
    && text(row, "DESCRIPTION") !== "BEATTY 2"
    && key(sourceLocal(row)) !== key("Slitter")
    && key(text(row, "LOCATION", "location")) !== key("Roll Former 3 Input"));
  const dafAll = derivedDafRows(dafAllBase);

  const clients = { FH: fh, VM: vm, SCA: scania, DAF: daf };
  const pairs = {
    FH: clientPairs(fh, "FH"), VM: clientPairs(vm, "VM"), SCA: clientPairs(scania, "SCA"), DAF: clientPairs(daf, "DAF"),
  };
  const allPairs = {
    FH: clientPairs(fhAll, "FH"), VM: clientPairs(vmAll, "VM"), SCA: clientPairs(scaniaAll, "SCA"), DAF: clientPairs(dafAll, "DAF"),
  };
  const days = {
    FH: futureDays(fhAll, todayDate), VM: futureDays(vmAll, todayDate), SCA: futureDays(scaniaAll, todayDate), DAF: futureDays(dafAll, todayDate),
  };
  const rates = {
    FH: rate(allPairs.FH, days.FH), VM: rate(allPairs.VM, days.VM), SCA: rate(allPairs.SCA, days.SCA), DAF: rate(allPairs.DAF, days.DAF),
  };
  const demand = input.demand;
  const segregationPcs = {
    FH: segregationCount(segregacaoRows(input.segregacao, input.contextDate), "FH"),
    SCA: segregationCount(segregacaoRows(input.segregacao, input.contextDate), "SCA"),
    DAF: segregationCount(segregacaoRows(input.segregacao, input.contextDate), "DAF"),
  };
  const segregationRowsForDate = segregation;

  const values: Record<string, number> = {};
  values["Q-D-E-FH"] = days.FH;
  values["Q-D-E-VM"] = days.VM;
  values["Q-D-E-SCA"] = days.SCA;
  values["Q-D-E-DAF"] = days.DAF;
  values["Q-D-E-T"] = days.FH + days.VM + days.SCA + days.DAF;
  values["P-M-FH"] = rates.FH;
  values["P-M-VM"] = rates.VM;
  values["P-M-SCA"] = rates.SCA;
  values["P-M-DAF"] = rates.DAF;

  const stockPairsAt = (client: "FH" | "VM" | "SCA" | "DAF", localName: string): number => localPairs(clients[client], client, localName);
  const stockDaysFor = (client: "FH" | "VM" | "SCA" | "DAF", localName: string, factor = 2): number => stockDays(stockPairsAt(client, localName), rates[client], factor);

  const setStock = (client: "FH" | "VM" | "SCA" | "DAF", measure: string, localName: string, factor = 2): void => {
    if (rates[client] > 0) values[measure] = stockDaysFor(client, localName, factor);
  };
  setStock("FH", "D-E-FH-B", "Beatty Output");
  setStock("VM", "D-E-VM-B", "Beatty Output");
  setStock("SCA", "D-E-SCA-B", "Beatty Output");
  setStock("DAF", "D-E-DAF-B", "Beatty Output");
  setStock("FH", "D-E-FH-CL", "Cantilever");
  setStock("VM", "D-E-VM-CL", "Cantilever");
  setStock("SCA", "D-E-SCA-CL", "Cantilever", .5);
  setStock("DAF", "D-E-DAF-CL", "Cantilever");
  setStock("FH", "D-E-FH-P.I", "Pintura Input 2", .5);
  setStock("VM", "D-E-VM-P.I", "Pintura Input 2");
  setStock("SCA", "D-E-SCA-P.I", "Pintura Input 2");
  setStock("DAF", "D-E-DAF-P.I", "Pintura Input 2");
  setStock("FH", "D-E-FH-P.A", "Buffer P.A - B3 e B4");
  setStock("SCA", "D-E-SCA-P.A", "Buffer P.A - B3 e B4");
  setStock("SCA", "D-E-SCA-REB", " MTG - REB");
  setStock("DAF", "D-E-DAF-REB", " MTG - REB");

  const stageDays = (client: "FH" | "VM" | "SCA" | "DAF", localName: string): number => safeDivide(stockPairsAt(client, localName) * 2, rates[client]);
  for (const client of ["FH", "VM", "SCA", "DAF"] as const) {
    if (rates[client] <= 0) continue;
    values[`E-P-D-${client}-RF3`] = stageDays(client, "Roll Former 3");
    values[`E-P-D-${client}-STJ`] = stageDays(client, "Ag. Stenhøj");
  }
  const scheduleReady = input.shippingSchedule !== undefined;
  const scheduleKeys = futureScheduleKeys(input.shippingSchedule, todayDate);
  const shippingRelated = {
    FH: rowsRelatedToSchedule(fh, "FH", scheduleKeys, ["Estoque FG"]),
    VM: rowsRelatedToSchedule(vm, "VM", scheduleKeys, ["Estoque FG"]),
    SCA: rowsRelatedToSchedule(scania, "SCA", scheduleKeys, ["Ag. Emb1", "Estoque FG"]),
    DAF: rowsRelatedToSchedule(daf, "DAF", scheduleKeys, ["Estoque FG"]),
  };
  if (scheduleReady) {
    values["E-P-D-FH-EMB"] = stockDays(clientPairs(shippingRelated.FH, "FH"), rates.FH, 2);
    values["E-P-D-VM-EMB"] = stockDays(clientPairs(shippingRelated.VM, "VM"), rates.VM, 2);
    values["E-P-D-SCA-EMB"] = stockDays(clientPairs(shippingRelated.SCA, "SCA"), rates.SCA, 2);
    values["E-P-D-DAF-EMB"] = stockDays(clientPairs(shippingRelated.DAF, "DAF"), rates.DAF, 2);
  }
  if (input.segregacao !== undefined) {
    if (rates.FH > 0) values["E-P-D-FH-M3"] = safeDivide(segregationPcs.FH, rates.FH);
    if (rates.SCA > 0) values["E-P-D-SCA-M3"] = safeDivide(segregationPcs.SCA, rates.SCA);
    if (rates.DAF > 0) values["E-P-D-DAF-M3"] = safeDivide(segregationPcs.DAF, rates.DAF);
  }

  const lctPieces = lctStock.reduce((total, row) => total + numeric(row, "TOTAL", "total"), 0);
  const rf2Pairs = distinct(rf2, "Rail id", "RAIL_ID") / 2;
  if (input.lctStock !== undefined) {
    values["E-P-LCT"] = lctPieces;
    if (rates.FH > 0) values["E-D-P-LCT"] = safeDivide(lctPieces, rates.FH);
  }
  if (input.rf2 !== undefined && rates.FH > 0) values["E-D-P-RF2"] = safeDivide(rf2Pairs * 2, rates.FH);

  const segregationFor = (enn: string, locations: string[], client?: string, excluded: string[] = []): number => segregationBy(segregationRowsForDate, enn, locations, client, excluded);
  const todayDemand = (measure: string): number => Number(demand[measure] ?? 0);
  if (input.segregacao !== undefined) {
    values["Q-D-S-RF2"] = safeDivide(segregationFor("Corte e Conformação", ["Rollformer 2"]), todayDemand("D-P-RF2"));
    values["Q-D-S-LPP2"] = safeDivide(segregationFor("Pintura", ["Pintura Input 2", "Pintura Output 2"], undefined, ["RETRABALHO CONCENTRICIDADE", "FULL INNER LINER"]), todayDemand("D-P-LPP2"));
    values["Q-D-S-RF3"] = safeDivide(segregationFor("Corte e Conformação", ["Roll Former 3"]), todayDemand("D-P-RF3"));
    values["Q-D-S-STJ"] = safeDivide(segregationFor("SEE", ["Stenhoj"]), todayDemand("D-P-STJ"));
    values["Q-D-S-EMB"] = safeDivide(segregationFor("SEE", ["Embalaje 1", "Embalaje 3"]), todayDemand("D-P-LPP2"));
    values["Q-D-S-T"] = values["Q-D-S-RF2"] + values["Q-D-S-LPP2"] + values["Q-D-S-RF3"] + values["Q-D-S-STJ"] + values["Q-D-S-EMB"];
  }

  // Q-D-* remove Calendar[Date] no PBIP; o comprimento médio usa todo o horizonte carregado.
  const baseSlitterLengths = allBase1
    .filter((row) => ["FH", "VM", "SCA"].includes(clientFromBase1(row) ?? ""))
    .filter(isSlitterLengthRow)
    .map(finishLengthMeters)
    .filter((value): value is number => value !== undefined);
  const scaniaSlitterLengths = input.scania === undefined ? [] : allScaniaFallback
    .filter(isSlitterLengthRow)
    .map(finishLengthMeters)
    .filter((value): value is number => value !== undefined);
  const dafSlitterLengths = rows(input.dafSlitters)
    .map(finishLengthMeters)
    .filter((value): value is number => value !== undefined);
  const slitterLengths = [...baseSlitterLengths, ...scaniaSlitterLengths, ...dafSlitterLengths];
  const averageFinishLength = safeDivide(slitterLengths.reduce((total, value) => total + value, 0), slitterLengths.length);

  const mpGroups = new Map<string, Set<LotClientGroup>>();
  const registerMp = (sourceRows: OracleRow[], resolveGroup: (row: OracleRow) => LotClientGroup | undefined): void => {
    for (const row of sourceRows) {
      const mp = text(row, "MP").toUpperCase();
      const group = resolveGroup(row);
      if (!mp || !group) continue;
      const groups = mpGroups.get(mp) ?? new Set<LotClientGroup>();
      groups.add(group);
      mpGroups.set(mp, groups);
    }
  };
  registerMp(allBase1, (row) => {
    const client = clientFromBase1(row);
    return client === "SCA" ? "SCA" : client === "FH" || client === "VM" ? "VDB" : undefined;
  });
  registerMp(allScaniaFallback, () => "SCA");
  registerMp(rows(input.dafSlitters), () => "DAF");

  const lotRows = rows(input.lotes).map((row) => {
    const meters = lotLengthMeters(row);
    const explicitGroup = normalizedLotClient(text(row, "Cliente", "CLIENTE", "DESCRIPTION"));
    const inferredGroups = mpGroups.get(text(row, "MP").toUpperCase());
    const inferredGroup = inferredGroups?.size === 1 ? [...inferredGroups][0] : undefined;
    return { meters, group: explicitGroup ?? inferredGroup };
  }).filter((row): row is { meters: number; group: LotClientGroup } => row.meters !== undefined && row.group !== undefined);

  if (input.lotes !== undefined && averageFinishLength > 0) {
    const totalLength = lotRows.reduce((total, row) => total + row.meters, 0);
    values["C-T-E"] = totalLength;
    values["C-P-M-TOTAL"] = averageFinishLength;
    values["E-M-P-S"] = Math.floor(totalLength / averageFinishLength);
    const groupForClient: Record<LayoutClient, LotClientGroup> = { FH: "VDB", VM: "VDB", SCA: "SCA", DAF: "DAF" };
    for (const client of ["FH", "VM", "SCA", "DAF"] as const) {
      const groupRows = lotRows.filter((row) => row.group === groupForClient[client]);
      if (!groupRows.length) continue;
      const pieces = Math.floor(groupRows.reduce((total, row) => total + row.meters, 0) / averageFinishLength);
      values[`E-M-P-S-${client}`] = pieces;
      if (rates[client] > 0) values[`Q-D-${client}`] = safeDivide(pieces, rates[client]);
    }
  }

  return {
    values,
    rows: {
      base1: base1.length,
      base2: base2.length,
      scania: scania.length,
      daf: daf.length,
      segregacao: segregation.length,
      "relatorio-item-rf2": rf2.length,
      "bi-mifc-lct-pos-stock": lctStock.length,
      "shipping-schedule": rows(input.shippingSchedule).length,
      "shipping-related-fh": shippingRelated.FH.length,
      "shipping-related-vm": shippingRelated.VM.length,
      "shipping-related-scania": shippingRelated.SCA.length,
      "shipping-related-daf": shippingRelated.DAF.length,
      "shipping-related-daf-slitters": rowsRelatedToSchedule(rows(input.dafSlitters), "DAF", scheduleKeys).length,
      "slitter-finish-lengths": slitterLengths.length,
      "slitter-lots-mapped": lotRows.length,
    },
  };
}

function segregacaoRows(input: unknown[] | undefined, contextDate: string): OracleRow[] {
  return rowsForDate(input, contextDate, ["DATA", "DATA SEGREGAÇÃO", "DATE"]);
}
