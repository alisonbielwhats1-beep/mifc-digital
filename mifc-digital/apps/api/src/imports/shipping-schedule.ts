import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { posix } from "node:path";
import { inflateRawSync } from "node:zlib";

export const SHIPPING_SCHEDULE_NETWORK_PATH = String.raw`\\metbrosawfse01\Publico\PowerBI\Logística\Programacao_embarque.xlsx`;
export const MAX_SHIPPING_SCHEDULE_BYTES = 10 * 1024 * 1024;

const REQUIRED_SHEET = "Data Embarque";
const REQUIRED_HEADERS = ["Flatbed", "Data", "Horário"] as const;
const MAX_ZIP_ENTRIES = 2_000;
const MAX_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;
const NETWORK_READ_TIMEOUT_MS = 12_000;
const MAX_WORKSHEET_ROWS = 50_000;
const MAX_WORKSHEET_COLUMNS = 128;

type CellValue = string | number | null;
type ScheduleSource = "network" | "upload";

export interface ShippingScheduleRow {
  Flatbed: string;
  Data: string;
  "Horário": string;
  Data__horario: string;
  Cliente: string;
  relationshipKey: string;
  sourceRow: number;
}

export interface ShippingScheduleSnapshot {
  ready: true;
  source: ScheduleSource;
  fileName: string;
  fileModifiedAt: string | null;
  importedAt: string;
  hash: string;
  sheet: string;
  columns: string[];
  rows: ShippingScheduleRow[];
  rejectedRows: number;
  removedTrailingRows: number;
  warnings: string[];
  clientCounts: Record<string, number>;
  dateRange: { first: string | null; last: string | null };
}

export type PublicShippingScheduleStatus =
  | {
    ready: false;
    networkPath: string;
    source: null;
    rowCount: 0;
    message: string;
  }
  | {
    ready: true;
    networkPath: string;
    source: ScheduleSource;
    fileName: string;
    fileModifiedAt: string | null;
    importedAt: string;
    hash: string;
    sheet: string;
    columns: string[];
    rowCount: number;
    rejectedRows: number;
    removedTrailingRows: number;
    warnings: string[];
    clientCounts: Record<string, number>;
    dateRange: { first: string | null; last: string | null };
    preview: ShippingScheduleRow[];
    relationships: string[];
  };

let cachedSchedule: ShippingScheduleSnapshot | null = null;
let networkRefreshInFlight: Promise<PublicShippingScheduleStatus> | null = null;
let cacheRevision = 0;

function withTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Tempo limite ao acessar a programação na rede.")), milliseconds);
    operation.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

function decodeXml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function xmlAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : null;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("Arquivo XLSX inválido: diretório ZIP não encontrado.");
}

function unzipEntries(buffer: Buffer): Map<string, Buffer> {
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("Arquivo inválido. Selecione uma planilha .xlsx válida.");
  }
  const directory = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(directory + 10);
  if (entryCount > MAX_ZIP_ENTRIES) throw new Error("Arquivo XLSX excede o limite seguro de conteúdo interno.");
  let offset = buffer.readUInt32LE(directory + 16);
  let expandedBytes = 0;
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Arquivo XLSX inválido: entrada ZIP corrompida.");
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength).replace(/^\/+/, "");
    if ((flags & 0x1) !== 0) throw new Error("Planilhas XLSX protegidas por senha não são aceitas.");
    if (/(?:^|\/)vbaProject\.bin$|^xl\/(?:externalLinks|embeddings)\//i.test(name)) {
      throw new Error("A planilha contém macro, vínculo externo ou objeto incorporado não aceito.");
    }
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_UNCOMPRESSED_BYTES) throw new Error("Arquivo XLSX excede o limite seguro após descompactação.");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Arquivo XLSX inválido: conteúdo ZIP corrompido.");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let content: Buffer;
    if (method === 0) content = Buffer.from(compressed);
    else if (method === 8) content = inflateRawSync(compressed, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
    else throw new Error(`Arquivo XLSX usa compactação não suportada (${method}).`);
    if (content.length !== uncompressedSize) throw new Error("Arquivo XLSX inválido: tamanho interno divergente.");
    entries.set(name, content);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function requiredXml(entries: Map<string, Buffer>, name: string): string {
  const entry = entries.get(name);
  if (!entry) throw new Error(`Arquivo XLSX inválido: conteúdo ${name} não encontrado.`);
  return entry.toString("utf8");
}

function sharedStrings(entries: Map<string, Buffer>): string[] {
  const xml = entries.get("xl/sharedStrings.xml")?.toString("utf8");
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((textMatch) => decodeXml(textMatch[1])).join(""),
  );
}

function sheetPath(entries: Map<string, Buffer>, sheetName: string): string {
  const workbook = requiredXml(entries, "xl/workbook.xml");
  const sheet = [...workbook.matchAll(/<sheet\b([^>]*)\/?\s*>/g)]
    .map((match) => match[1])
    .find((attributes) => xmlAttribute(attributes, "name") === sheetName);
  if (!sheet) throw new Error(`Aba obrigatória "${sheetName}" não encontrada.`);
  const relationshipId = xmlAttribute(sheet, "r:id");
  if (!relationshipId) throw new Error(`Aba "${sheetName}" sem relacionamento interno válido.`);
  const relationships = requiredXml(entries, "xl/_rels/workbook.xml.rels");
  const relationship = [...relationships.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)]
    .map((match) => match[1])
    .find((attributes) => xmlAttribute(attributes, "Id") === relationshipId);
  const target = relationship ? xmlAttribute(relationship, "Target") : null;
  if (!target) throw new Error(`Conteúdo da aba "${sheetName}" não encontrado.`);
  return target.startsWith("/") ? target.replace(/^\/+/, "") : posix.normalize(posix.join("xl", target));
}

function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0].toUpperCase();
  if (!letters) return -1;
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseSheet(xml: string, strings: string[]): CellValue[][] {
  const matrix: CellValue[][] = [];
  for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attributes = match[1];
    const reference = xmlAttribute(attributes, "r");
    if (!reference) continue;
    const rowIndex = Number.parseInt(reference.match(/\d+$/)?.[0] ?? "0", 10) - 1;
    const colIndex = columnIndex(reference);
    if (rowIndex < 0 || colIndex < 0) continue;
    if (rowIndex >= MAX_WORKSHEET_ROWS || colIndex >= MAX_WORKSHEET_COLUMNS) {
      throw new Error("Aba Data Embarque excede o limite seguro de linhas ou colunas.");
    }
    const type = xmlAttribute(attributes, "t");
    const raw = match[2].match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
    const inline = [...match[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join("");
    let value: CellValue = null;
    if (type === "s" && raw !== undefined) value = strings[Number.parseInt(raw, 10)] ?? "";
    else if ((type === "inlineStr" || type === "str") && inline) value = inline;
    else if (raw !== undefined && raw !== "") {
      const numeric = Number(raw);
      value = Number.isFinite(numeric) ? numeric : decodeXml(raw);
    }
    if (value === null || value === "") continue;
    matrix[rowIndex] ??= [];
    matrix[rowIndex][colIndex] = value;
  }
  return matrix;
}

function plainText(value: CellValue | undefined): string {
  return String(value ?? "").trim();
}

function headerKey(value: CellValue | undefined): string {
  return plainText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function excelSerialToDate(value: number): string | null {
  if (!Number.isFinite(value) || value < 1 || value > 2_958_465) return null;
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

function normalizedDate(value: CellValue | undefined): string | null {
  if (typeof value === "number") return excelSerialToDate(value);
  const raw = plainText(value);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const serial = Number(raw);
  return Number.isFinite(serial) ? excelSerialToDate(serial) : null;
}

function normalizedTime(value: CellValue | undefined): string | null {
  if (typeof value === "number") {
    const seconds = ((Math.round((value % 1) * 86_400) % 86_400) + 86_400) % 86_400;
    const hour = Math.floor(seconds / 3_600);
    const minute = Math.floor((seconds % 3_600) / 60);
    const second = seconds % 60;
    return [hour, minute, second].map((part) => String(part).padStart(2, "0")).join(":");
  }
  const match = plainText(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}` : null;
}

function normalizedFlatbed(value: CellValue | undefined): string | null {
  if (typeof value === "number") return excelSerialToDate(value);
  const raw = plainText(value);
  if (!raw) return null;
  if (/^\d+(?:\.0+)?$/.test(raw)) return excelSerialToDate(Number(raw)) ?? raw.replace(/\.0+$/, "");
  return raw;
}

function scheduleClient(flatbed: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(flatbed)) return "DAF";
  const prefix = flatbed.split("_")[0].toUpperCase();
  if (prefix.startsWith("SCA")) return "SCA";
  if (prefix.startsWith("VDB")) return "VM";
  if (prefix.startsWith("FH")) return "FH";
  return prefix.slice(0, 3) || "OUTROS";
}

export function normalizeShippingScheduleMatrix(matrix: CellValue[][]): Omit<ShippingScheduleSnapshot, "ready" | "source" | "fileName" | "fileModifiedAt" | "importedAt" | "hash"> {
  const header = matrix[0] ?? [];
  const indexes = new Map(header.map((value, index) => [headerKey(value), index]));
  const missing = REQUIRED_HEADERS.filter((name) => !indexes.has(headerKey(name)));
  if (missing.length) throw new Error(`Estrutura da aba "${REQUIRED_SHEET}" inválida. Colunas ausentes: ${missing.join(", ")}.`);
  const flatbedIndex = indexes.get(headerKey("Flatbed"))!;
  const dateIndex = indexes.get(headerKey("Data"))!;
  const timeIndex = indexes.get(headerKey("Horário"))!;
  const dateTimeIndex = indexes.get(headerKey("Data__horario"));
  const activeRows = matrix.slice(1).map((row, index) => ({ row, sourceRow: index + 2 }))
    .filter(({ row }) => [flatbedIndex, dateIndex, timeIndex].some((cell) => plainText(row[cell]) !== ""));

  // O Power Query do PBIP elimina a última linha útil após remover vazios.
  const pbipRows = activeRows.length ? activeRows.slice(0, -1) : [];
  const rows: ShippingScheduleRow[] = [];
  let rejectedRows = 0;
  for (const { row, sourceRow } of pbipRows) {
    const flatbed = normalizedFlatbed(row[flatbedIndex]);
    const date = normalizedDate(row[dateIndex]);
    const time = normalizedTime(row[timeIndex]);
    if (!flatbed || !date || !time) {
      rejectedRows += 1;
      continue;
    }
    const providedDateTime = dateTimeIndex === undefined ? "" : plainText(row[dateTimeIndex]);
    rows.push({
      Flatbed: flatbed,
      Data: date,
      "Horário": time,
      Data__horario: providedDateTime || `${date}T${time}`,
      Cliente: scheduleClient(flatbed),
      relationshipKey: flatbed.trim().toUpperCase(),
      sourceRow,
    });
  }
  if (!rows.length) throw new Error(`A aba "${REQUIRED_SHEET}" não contém linhas válidas após aplicar as regras do PBIP.`);
  const clientCounts: Record<string, number> = {};
  for (const row of rows) clientCounts[row.Cliente] = (clientCounts[row.Cliente] ?? 0) + 1;
  const dates = rows.map((row) => row.Data).sort();
  const columns = header.map(plainText).filter(Boolean);
  const warnings: string[] = [];
  if (rejectedRows) warnings.push(`${rejectedRows} linha(s) ignorada(s) por Flatbed, Data ou Horário inválido.`);
  if (dateTimeIndex === undefined || rows.every((row) => row.Data__horario === `${row.Data}T${row["Horário"]}`)) {
    warnings.push("Data__horario foi recomposta a partir de Data e Horário.");
  }
  return {
    sheet: REQUIRED_SHEET,
    columns,
    rows,
    rejectedRows,
    removedTrailingRows: activeRows.length ? 1 : 0,
    warnings,
    clientCounts,
    dateRange: { first: dates[0] ?? null, last: dates.at(-1) ?? null },
  };
}

export function parseShippingScheduleWorkbook(
  buffer: Buffer,
  source: ScheduleSource,
  fileName: string,
  fileModifiedAt: string | null,
): ShippingScheduleSnapshot {
  if (buffer.length > MAX_SHIPPING_SCHEDULE_BYTES) throw new Error("Arquivo excede o limite de 10 MB.");
  const entries = unzipEntries(buffer);
  const worksheet = requiredXml(entries, sheetPath(entries, REQUIRED_SHEET));
  const normalized = normalizeShippingScheduleMatrix(parseSheet(worksheet, sharedStrings(entries)));
  return {
    ready: true,
    source,
    fileName,
    fileModifiedAt,
    importedAt: new Date().toISOString(),
    hash: createHash("sha256").update(buffer).digest("hex").slice(0, 16),
    ...normalized,
  };
}

export async function refreshShippingScheduleFromNetwork(): Promise<PublicShippingScheduleStatus> {
  if (networkRefreshInFlight) return networkRefreshInFlight;
  const startingRevision = cacheRevision;
  networkRefreshInFlight = withTimeout((async () => {
    const metadata = await stat(SHIPPING_SCHEDULE_NETWORK_PATH);
    if (!metadata.isFile()) throw new Error("O caminho da programação não aponta para um arquivo.");
    if (metadata.size > MAX_SHIPPING_SCHEDULE_BYTES) throw new Error("Arquivo da rede excede o limite de 10 MB.");
    const buffer = await readFile(SHIPPING_SCHEDULE_NETWORK_PATH);
    const parsed = parseShippingScheduleWorkbook(buffer, "network", "Programacao_embarque.xlsx", metadata.mtime.toISOString());
    if (cacheRevision === startingRevision) {
      cachedSchedule = parsed;
      cacheRevision += 1;
    }
    return getShippingScheduleStatus();
  })(), NETWORK_READ_TIMEOUT_MS);
  try {
    return await networkRefreshInFlight;
  } finally {
    networkRefreshInFlight = null;
  }
}

export function importShippingScheduleUpload(buffer: Buffer, fileName: string, fileModifiedAt: string | null): PublicShippingScheduleStatus {
  const safeName = fileName.replace(/[\\/\0]/g, "_").slice(0, 180) || "Programacao_embarque.xlsx";
  if (!safeName.toLocaleLowerCase("pt-BR").endsWith(".xlsx")) throw new Error("Selecione um arquivo com extensão .xlsx.");
  cachedSchedule = parseShippingScheduleWorkbook(buffer, "upload", safeName, fileModifiedAt);
  cacheRevision += 1;
  return getShippingScheduleStatus();
}

export function getCachedShippingSchedule(): ShippingScheduleSnapshot | null {
  return cachedSchedule;
}

export function getShippingScheduleStatus(): PublicShippingScheduleStatus {
  if (!cachedSchedule) {
    return {
      ready: false,
      networkPath: SHIPPING_SCHEDULE_NETWORK_PATH,
      source: null,
      rowCount: 0,
      message: "Programação ainda não carregada. Tente a rede ou selecione o arquivo .xlsx.",
    };
  }
  const { rows, ...snapshot } = cachedSchedule;
  return {
    ...snapshot,
    networkPath: SHIPPING_SCHEDULE_NETWORK_PATH,
    rowCount: rows.length,
    preview: rows.slice(0, 6),
    relationships: [
      "FH.FH Flatbed_2 → Dados de embarque.Flatbed",
      "VM.Flatbed_2 → Dados de embarque.Flatbed",
      "SCANIA.Flatbed_2 → Dados de embarque.Flatbed",
      "DAF.Flatbed → Dados de embarque.Flatbed",
      "DAF SLITTERS.Data → Dados de embarque.Flatbed",
      "Dados de embarque.Data → calendário local de Data",
    ],
  };
}
