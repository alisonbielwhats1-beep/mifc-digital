import { loadQueryCatalog } from "./query-catalog.js";
import { extractCatalogSqlUnchecked, fingerprintSql } from "./source-query.js";
import { assertSelectOnly } from "./sql-policy.js";

async function main(): Promise<void> {
  const catalog = await loadQueryCatalog();
  console.log("MIFC Digital — auditoria local do catálogo Oracle");
  for (const entry of catalog) {
    if (entry.queryMode !== "embedded-sql") {
      console.log(`${entry.id}\tnavigation-m\tPENDENTE`);
      continue;
    }
    const sql = await extractCatalogSqlUnchecked(entry);
    assertSelectOnly(sql);
    console.log(`${entry.id}\t${fingerprintSql(sql)}\tSELECT-ONLY`);
  }
  console.log("Nenhuma conexão Oracle foi aberta e nenhuma consulta foi executada.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
