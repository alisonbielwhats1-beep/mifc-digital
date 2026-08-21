import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getOracleConfig } from "../config.js";

export interface QueryCatalogEntry {
  id: string;
  powerBiObject: string;
  sourceFile: string;
  sourceType: "oracle";
  queryMode: "embedded-sql" | "navigation-m";
  status: string;
  enabled: boolean;
  usedBy: string[];
  expectedFingerprint?: string;
  expectedSchema?: string;
  expectedSourceObject?: string;
  maxRows?: number;
  timeoutSeconds?: number;
  refreshSeconds?: number;
}

export async function loadQueryCatalog(): Promise<QueryCatalogEntry[]> {
  const config = getOracleConfig();
  const catalogPath = resolve(process.cwd(), config.catalogPath);
  const content = await readFile(catalogPath, "utf8");
  const catalog = JSON.parse(content) as unknown;

  if (!Array.isArray(catalog)) {
    throw new Error("O catálogo Oracle precisa ser uma lista JSON.");
  }

  return catalog as QueryCatalogEntry[];
}

export async function getAllowlistedQuery(
  id: string,
): Promise<QueryCatalogEntry> {
  const catalog = await loadQueryCatalog();
  const entry = catalog.find((item) => item.id === id);

  if (!entry) {
    throw new Error(`Consulta não encontrada na allowlist: ${id}`);
  }

  if (!entry.enabled) {
    throw new Error(
      `Consulta ainda não liberada após validação de dependências: ${id}`,
    );
  }

  return entry;
}
