import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error("Uso: node scripts/generate-mifc-semantic-inventory.mjs <semantic.json> <saida.csv>");
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const model = JSON.parse(readFileSync(input, "utf8"));

const csv = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[\",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const compact = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

function partitionSource(body) {
  const text = compact(body);
  if (/Oracle\.Database/i.test(text)) return "Oracle MESBR";
  if (/Sql\.Database/i.test(text)) return "SQL Server DT_LOGGER";
  if (/Excel\.Workbook/i.test(text)) return "Excel em rede";
  if (/= calculated/i.test(text)) return "DAX calculado";
  if (/Table\.FromRows/i.test(text)) return "Tabela M embutida";
  return "Power Query M / derivada";
}

const headers = [
  "kind", "table", "name", "data_type", "format", "hidden_or_inactive", "source_or_target",
  "dependencies_or_definition", "status",
];
const rows = [];
const add = (...values) => rows.push(values.map(csv).join(","));

for (const table of model.tables) {
  add(
    "TABLE", table.name, table.name, "table", "", table.hidden,
    table.file,
    `${table.column_count} colunas; ${table.measure_count} medidas; ${table.partition_count} partições; ${table.hierarchies.length} hierarquias`,
    "INVENTARIADO",
  );

  for (const column of table.columns) {
    add(
      "COLUMN", table.name, column.name, column.data_type, column.format_string,
      column.hidden, column.source_column,
      `summarizeBy=${column.summarize_by ?? ""}`,
      "INVENTARIADO",
    );
  }

  for (const measure of table.measures) {
    add(
      "MEASURE", table.name, measure.name, "measure", measure.format_string,
      measure.hidden, measure.display_folder,
      measure.dependencies.join("; "),
      "INVENTARIADO — validação funcional nos gates",
    );
  }

  for (const partition of table.partitions) {
    add(
      "PARTITION", table.name, partition.name, partition.mode, "", table.hidden,
      partitionSource(partition.body),
      compact(partition.body),
      "INVENTARIADO — atualização e credenciais fora do modelo",
    );
  }
}

for (const relationship of model.relationships) {
  const fromTable = relationship.from.split(".")[0];
  add(
    "RELATIONSHIP", fromTable, relationship.id, "relationship", "", !relationship.active,
    `${relationship.from} -> ${relationship.to}`,
    `active=${relationship.active}; crossFiltering=${relationship.cross_filtering ?? "default"}; securityFiltering=${relationship.security_filtering ?? "default"}; joinOnDate=${relationship.join_on_date ?? ""}`,
    relationship.active ? "INVENTARIADO" : "INVENTARIADO — relação inativa",
  );
}

writeFileSync(output, `${headers.join(",")}\n${rows.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ output, rows: rows.length, ...Object.fromEntries(
  ["TABLE", "COLUMN", "MEASURE", "PARTITION", "RELATIONSHIP"].map((kind) => [kind, rows.filter((row) => row.startsWith(`${kind},`)).length]),
) }, null, 2));
