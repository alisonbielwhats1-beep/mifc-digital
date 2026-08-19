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

export interface NavigationTarget {
  schema: string;
  object: string;
}

function scopePowerBiObject(content: string, powerBiObject: string): string {
  const expressionMarker = `expression ${powerBiObject} =`;
  const quotedExpressionMarker = `expression '${powerBiObject}' =`;
  const expressionStart = Math.max(content.indexOf(expressionMarker), content.indexOf(quotedExpressionMarker));
  if (expressionStart < 0) return content;
  const nextExpression = content.indexOf("\nexpression ", expressionStart + 1);
  return content.slice(expressionStart, nextExpression >= 0 ? nextExpression : undefined);
}

function decodeNavigationName(value: string): string {
  return value.replace(/""/g, '"').trim();
}

function assertOracleIdentifier(value: string, label: string): void {
  if (!/^[A-Z][A-Z0-9_$#]*$/i.test(value)) {
    throw new Error(`${label} Oracle inválido na navegação M: ${value}`);
  }
}

export function extractNavigationTargetFromTmdl(content: string, powerBiObject: string): NavigationTarget {
  const scoped = scopePowerBiObject(content, powerBiObject);
  const schemaMatches = [...scoped.matchAll(/\{\s*\[\s*Schema\s*=\s*"((?:""|[^"])*)"\s*\]\s*\}\s*\[\s*Data\s*\]/gi)];
  const objectMatches = [...scoped.matchAll(/\{\s*\[\s*Name\s*=\s*"((?:""|[^"])*)"(?:\s*,[^\]]*)?\]\s*\}\s*\[\s*Data\s*\]/gi)];
  const schema = decodeNavigationName(schemaMatches.at(-1)?.[1] ?? "");
  const object = decodeNavigationName(objectMatches.at(-1)?.[1] ?? "");
  if (!schema || !object) {
    throw new Error(`Destino Schema/Name não encontrado na navegação M de ${powerBiObject}.`);
  }
  assertOracleIdentifier(schema, "Schema");
  assertOracleIdentifier(object, "Objeto");
  return { schema, object };
}

export function materializeNavigationSelect(
  content: string,
  entry: Pick<QueryCatalogEntry, "powerBiObject" | "expectedSchema" | "expectedSourceObject">,
): string {
  const target = extractNavigationTargetFromTmdl(content, entry.powerBiObject);
  if (!entry.expectedSchema || target.schema.toUpperCase() !== entry.expectedSchema.toUpperCase()) {
    throw new Error(`Schema divergente na navegação M de ${entry.powerBiObject}.`);
  }
  if (!entry.expectedSourceObject || target.object.toUpperCase() !== entry.expectedSourceObject.toUpperCase()) {
    throw new Error(`Objeto divergente na navegação M de ${entry.powerBiObject}: esperado ${entry.expectedSourceObject ?? "não configurado"}, encontrado ${target.object}.`);
  }
  return `SELECT * FROM "${target.schema.toUpperCase()}"."${target.object.toUpperCase()}"`;
}

export function normalizeSql(sql: string): string {
  return sql.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trimEnd()).join("\n").trim();
}

export function fingerprintSql(sql: string): string {
  return `sha256:${createHash("sha256").update(normalizeSql(sql), "utf8").digest("hex")}`;
}

export async function extractCatalogSqlUnchecked(entry: QueryCatalogEntry): Promise<string> {
  const config = getOracleConfig();
  const root = resolve(config.pbipPath);
  const sourcePath = resolve(root, entry.sourceFile);
  if (sourcePath !== root && !sourcePath.startsWith(`${root}${sep}`)) throw new Error("Caminho da consulta fora do PBIP autorizado.");
  const content = await readFile(sourcePath, "utf8");
  const sql = entry.queryMode === "embedded-sql"
    ? extractEmbeddedSqlFromTmdl(content, entry.powerBiObject)
    : materializeNavigationSelect(content, entry);
  return normalizeSql(sql);
}

export async function loadCatalogSql(entry: QueryCatalogEntry): Promise<string> {
  const sql = await extractCatalogSqlUnchecked(entry);
  const actualFingerprint = fingerprintSql(sql);
  if (!entry.expectedFingerprint || actualFingerprint !== entry.expectedFingerprint) throw new Error(`Fingerprint divergente para ${entry.id}. Revise o PBIP e a allowlist antes de executar.`);
  return sql;
}
