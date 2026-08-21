import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface LayoutMeasureLineageEntry {
  measure: string;
  description: string;
  dependencies: string[];
  directTables: string[];
  upstreamTables: string[];
  sourceClass: string;
  displayFolder: string;
  formatString: string;
  formula: string;
  cardCount: number;
  clients: string[];
}

let cachedLineage: Record<string, LayoutMeasureLineageEntry> | undefined;

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
}

function splitList(value: string): string[] {
  return value.split(";").map((item) => item.trim()).filter(Boolean);
}

export async function loadLayoutMeasureLineage(): Promise<Record<string, LayoutMeasureLineageEntry>> {
  if (cachedLineage) return cachedLineage;
  const path = resolve(process.cwd(), "docs/layout-measure-catalog.csv");
  const rows = parseCsvRows(await readFile(path, "utf8"));
  const header = rows.shift() ?? [];
  const indexOf = (name: string) => header.indexOf(name);
  const valueAt = (row: string[], name: string): string => row[indexOf(name)]?.trim() ?? "";
  const lineage: Record<string, LayoutMeasureLineageEntry> = {};

  for (const row of rows) {
    const measure = valueAt(row, "measure");
    if (!measure) continue;
    lineage[measure] = {
      measure,
      description: valueAt(row, "description"),
      dependencies: splitList(valueAt(row, "measure_dependencies")),
      directTables: splitList(valueAt(row, "direct_tables")),
      upstreamTables: splitList(valueAt(row, "upstream_tables")),
      sourceClass: valueAt(row, "source_class"),
      displayFolder: valueAt(row, "display_folder"),
      formatString: valueAt(row, "format_string"),
      formula: valueAt(row, "formula"),
      cardCount: Number(valueAt(row, "card_count")) || 0,
      clients: splitList(valueAt(row, "clients")),
    };
  }

  cachedLineage = lineage;
  return lineage;
}
