import type { OracleCredentials, ReadOnlyQueryResult } from "./read-only-client.js";
import { executeAllowlistedSelect } from "./read-only-client.js";
import { loadQueryCatalog } from "./query-catalog.js";
import { selectSyncCandidates } from "./sync-policy.js";

export interface SyncedTableSummary {
  queryId: string;
  powerBiObject: string;
  usedBy: string[];
  rowCount: number;
  columns: string[];
  durationMs: number;
  syncedAt: string;
}

export interface SyncFailure {
  queryId: string;
  powerBiObject: string;
  message: string;
}

interface CachedTable {
  result: ReadOnlyQueryResult;
  summary: SyncedTableSummary;
}

const tableCache = new Map<string, CachedTable>();

export function getTableSyncStatus() {
  const tables = [...tableCache.values()].map(({ summary }) => summary);
  return {
    connected: tables.length > 0,
    tableCount: tables.length,
    rowCount: tables.reduce((total, table) => total + table.rowCount, 0),
    lastSyncedAt: tables.map((table) => table.syncedAt).sort().at(-1) ?? null,
    tables,
  };
}

export function getCachedTable(queryId: string): ReadOnlyQueryResult | undefined {
  return tableCache.get(queryId)?.result;
}

export async function syncApprovedTables(credentials: OracleCredentials) {
  const catalog = await loadQueryCatalog();
  const candidates = selectSyncCandidates(catalog);
  const tables: SyncedTableSummary[] = [];
  const failures: SyncFailure[] = [];

  for (const entry of candidates) {
    try {
      const result = await executeAllowlistedSelect(entry.id, {}, credentials);
      const summary: SyncedTableSummary = {
        queryId: entry.id,
        powerBiObject: entry.powerBiObject,
        usedBy: entry.usedBy,
        rowCount: result.rowCount,
        columns: result.columns,
        durationMs: result.durationMs,
        syncedAt: new Date().toISOString(),
      };
      tableCache.set(entry.id, { result, summary });
      tables.push(summary);
    } catch (error: unknown) {
      failures.push({
        queryId: entry.id,
        powerBiObject: entry.powerBiObject,
        message: error instanceof Error ? error.message : "Falha inesperada durante a leitura.",
      });
    }
  }

  return {
    ok: failures.length === 0,
    message: failures.length === 0
      ? `${tables.length} tabelas aprovadas foram carregadas em modo somente leitura.`
      : `${tables.length} tabelas foram carregadas e ${failures.length} apresentaram falha.`,
    tables,
    failures,
  };
}
