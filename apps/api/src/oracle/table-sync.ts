import { getOracleConfig } from "../config.js";
import type { OracleCredentials, ReadOnlyQueryResult } from "./read-only-client.js";
import { executeAllowlistedSelect } from "./read-only-client.js";
import { loadQueryCatalog, type QueryCatalogEntry } from "./query-catalog.js";
import { calculateTableDelta, reachedRowLimit, selectSyncCandidates, type TableDelta } from "./sync-policy.js";

const SCHEDULER_TICK_SECONDS = 15;

export interface SyncedTableSummary {
  queryId: string;
  powerBiObject: string;
  usedBy: string[];
  rowCount: number;
  columns: string[];
  durationMs: number;
  syncedAt: string;
  maxRows: number;
  limitReached: boolean;
  refreshSeconds: number;
  delta: TableDelta;
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
let automaticRefreshTimer: ReturnType<typeof setInterval> | undefined;
const automaticRefreshState = {
  active: false,
  refreshing: false,
  mode: "staggered-local-delta" as const,
  intervalSeconds: 300,
  tickSeconds: SCHEDULER_TICK_SECONDS,
  startedAt: null as string | null,
  nextRefreshAt: null as string | null,
  lastCompletedAt: null as string | null,
  lastQueryId: null as string | null,
  lastError: null as string | null,
  reason: null as string | null,
};

function refreshInterval(entry: QueryCatalogEntry): number {
  return Math.max(60, entry.refreshSeconds ?? getOracleConfig().autoRefreshSeconds);
}

function dueAt(table: CachedTable): number {
  return new Date(table.summary.syncedAt).getTime() + table.summary.refreshSeconds * 1_000;
}

function updateNextRefreshAt(): void {
  const dueTimes = [...tableCache.values()].map(dueAt).filter(Number.isFinite);
  automaticRefreshState.nextRefreshAt = dueTimes.length ? new Date(Math.min(...dueTimes)).toISOString() : null;
}

export function getAutomaticRefreshStatus() {
  return { ...automaticRefreshState };
}

export function getTableSyncStatus() {
  const tables = [...tableCache.values()].map(({ summary }) => summary);
  return {
    connected: tables.length > 0,
    tableCount: tables.length,
    rowCount: tables.reduce((total, table) => total + table.rowCount, 0),
    lastSyncedAt: tables.map((table) => table.syncedAt).sort().at(-1) ?? null,
    automaticRefresh: getAutomaticRefreshStatus(),
    tables,
  };
}

export function getCachedTable(queryId: string): ReadOnlyQueryResult | undefined {
  return tableCache.get(queryId)?.result;
}

export async function syncApprovedTables(credentials: OracleCredentials, queryIds?: string[]) {
  const catalog = await loadQueryCatalog();
  const requested = queryIds ? new Set(queryIds) : null;
  const candidates = selectSyncCandidates(catalog).filter((entry) => !requested || requested.has(entry.id));
  const tables: SyncedTableSummary[] = [];
  const failures: SyncFailure[] = [];
  const stagedTables = new Map<string, CachedTable>();

  for (const entry of candidates) {
    try {
      const result = await executeAllowlistedSelect(entry.id, {}, credentials);
      const previous = tableCache.get(entry.id)?.result.rows ?? [];
      const delta = calculateTableDelta(previous, result.rows);
      const summary: SyncedTableSummary = {
        queryId: entry.id,
        powerBiObject: entry.powerBiObject,
        usedBy: entry.usedBy,
        rowCount: result.rowCount,
        columns: result.columns,
        durationMs: result.durationMs,
        syncedAt: new Date().toISOString(),
        maxRows: entry.maxRows ?? 5_000,
        limitReached: reachedRowLimit(result.rowCount, entry.maxRows ?? 5_000),
        refreshSeconds: refreshInterval(entry),
        delta,
      };
      stagedTables.set(entry.id, { result, summary });
      tables.push(summary);
    } catch (error: unknown) {
      failures.push({
        queryId: entry.id,
        powerBiObject: entry.powerBiObject,
        message: error instanceof Error ? error.message : "Falha inesperada durante a leitura.",
      });
    }
  }

  if (failures.length === 0 || tableCache.size === 0) {
    for (const [id, table] of stagedTables) tableCache.set(id, table);
    updateNextRefreshAt();
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

async function runAutomaticRefresh(): Promise<void> {
  if (automaticRefreshState.refreshing) return;
  const config = getOracleConfig();
  if (!config.liveReadsEnabled || !config.user || !config.password) {
    automaticRefreshState.active = false;
    automaticRefreshState.reason = "Leitura ao vivo ou credenciais locais indisponíveis.";
    if (automaticRefreshTimer) clearInterval(automaticRefreshTimer);
    automaticRefreshTimer = undefined;
    return;
  }

  const catalog = selectSyncCandidates(await loadQueryCatalog());
  const now = Date.now();
  const due = catalog
    .map((entry) => ({ entry, dueAt: tableCache.has(entry.id) ? dueAt(tableCache.get(entry.id)!) : 0 }))
    .filter((item) => item.dueAt <= now)
    .sort((left, right) => left.dueAt - right.dueAt);
  if (!due.length) {
    updateNextRefreshAt();
    return;
  }

  automaticRefreshState.refreshing = true;
  automaticRefreshState.lastError = null;
  automaticRefreshState.lastQueryId = due[0].entry.id;
  try {
    const result = await syncApprovedTables({ user: config.user, password: config.password }, [due[0].entry.id]);
    automaticRefreshState.lastCompletedAt = new Date().toISOString();
    automaticRefreshState.lastError = result.ok ? null : result.message;
  } catch (error: unknown) {
    automaticRefreshState.lastError = error instanceof Error ? error.message : "Falha na atualização automática.";
  } finally {
    automaticRefreshState.refreshing = false;
    updateNextRefreshAt();
  }
}

export function startAutomaticRefresh() {
  const config = getOracleConfig();
  automaticRefreshState.intervalSeconds = config.autoRefreshSeconds;

  if (!config.liveReadsEnabled || !config.user || !config.password) {
    automaticRefreshState.active = false;
    automaticRefreshState.reason = "Configure as credenciais no .env para manter a atualização automática.";
    return getAutomaticRefreshStatus();
  }

  if (automaticRefreshTimer) return getAutomaticRefreshStatus();
  automaticRefreshState.active = true;
  automaticRefreshState.startedAt = new Date().toISOString();
  automaticRefreshState.reason = null;
  updateNextRefreshAt();
  automaticRefreshTimer = setInterval(() => void runAutomaticRefresh(), SCHEDULER_TICK_SECONDS * 1_000);
  automaticRefreshTimer.unref?.();
  return getAutomaticRefreshStatus();
}
