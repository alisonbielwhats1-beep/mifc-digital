import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { assertSafeOracleConfig, getOracleConfig } from "../config.js";
import { loadQueryCatalog } from "./query-catalog.js";

async function main(): Promise<void> {
  const config = getOracleConfig();
  assertSafeOracleConfig(config);

  const catalog = await loadQueryCatalog();
  const catalogPath = resolve(process.cwd(), config.catalogPath);
  const pending = catalog.filter((entry) => !entry.enabled).length;

  console.log("MIFC Digital — Oracle preflight");
  console.log(`Host: ${config.host}`);
  console.log(`Porta: ${config.port}`);
  console.log(`Serviço: ${config.serviceName}`);
  console.log(`Somente leitura: ${config.readOnly ? "ATIVO" : "INSEGURO"}`);
  console.log(
    `Leituras live: ${config.liveReadsEnabled ? "ATIVAS" : "DESATIVADAS"}`,
  );
  console.log(`Catálogo: ${catalogPath}`);
  console.log(`Entradas no catálogo: ${catalog.length}`);
  console.log(`Entradas pendentes de liberação: ${pending}`);
  console.log(`Catálogo existe: ${existsSync(catalogPath) ? "SIM" : "NÃO"}`);
  console.log("Nenhuma consulta SQL foi executada por este preflight.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
