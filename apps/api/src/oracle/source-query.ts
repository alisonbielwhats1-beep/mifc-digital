import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { getOracleConfig } from "../config.js";
import type { QueryCatalogEntry } from "./query-catalog.js";

function decodeMString(source: string, start: number): { value: string; end: number } {
  let value = "";
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (source[index + 1] === '"') { value += '"'; index += 1; continue; }
      return { value, end: index };
    }
    value += character;
  }
  throw new Error("String M da consulta Oracle não foi encerrada.");
}

export function decodePowerQueryEscapes(value: string): string {
  return value.replace(/#\(lf\)/gi, "\n").replace(/#\(cr\)/gi, "\r").replace(/#\(tab\)/gi, "\t");
}

export function extractEmbeddedSqlFromTmdl(content: string, powerBiObject: string): string {
  let scoped = content;
  const expressionMarker = `expression ${powerBiObject} =`;
  const expressionStart = content.indexOf(expressionMarker);
  if (expressionStart >= 0) {
    const nextExpression = content.indexOf("\nexpression ", expressionStart + expressionMarker.length);
    scoped = content.slice(expressionStart, nextExpression >= 0 ? nextExpression : undefined);
  }

  const queryMarker = 'Query="';
  const queryStart = scoped.indexOf(queryMarker);
  if (queryStart < 0) throw new Error(`SQL embutido não encontrado no objeto Power BI ${powerBiObject}.`);
  const decoded = decodeMString(scoped, queryStart + queryMarker.length).value;
  return decodePowerQueryEscapes(decoded);
}

export function normalizeSql(sql: string): string {
  return sql.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trimEnd()).join("\n").trim();
}

export function fingerprintSql(sql: string): string {
  return `sha256:${createHash("sha256").update(normalizeSql(sql), "utf8").digest("hex")}`;
}

export async function extractCatalogSqlUnchecked(entry: QueryCatalogEntry): Promise<string> {
  if (entry.queryMode !== "embedded-sql") throw new Error(`O objeto ${entry.id} usa navegação M e não possui SQL aprovado para execução.`);
  const config = getOracleConfig();
  const root = resolve(config.pbipPath);
  const sourcePath = resolve(root, entry.sourceFile);
  if (sourcePath !== root && !sourcePath.startsWith(`${root}${sep}`)) throw new Error("Caminho da consulta fora do PBIP autorizado.");
  const content = await readFile(sourcePath, "utf8");
  return normalizeSql(extractEmbeddedSqlFromTmdl(content, entry.powerBiObject));
}

export async function loadCatalogSql(entry: QueryCatalogEntry): Promise<string> {
  const sql = await extractCatalogSqlUnchecked(entry);
  const actualFingerprint = fingerprintSql(sql);
  if (!entry.expectedFingerprint || actualFingerprint !== entry.expectedFingerprint) throw new Error(`Fingerprint divergente para ${entry.id}. Revise o PBIP e a allowlist antes de executar.`);
  return sql;
}
