import oracledb from "oracledb";
import { assertSafeOracleConfig, getOracleConfig } from "../config.js";
import { getAllowlistedQuery } from "./query-catalog.js";
import { loadCatalogSql } from "./source-query.js";
import { assertSelectOnly } from "./sql-policy.js";

const oracleDriver = oracledb as unknown as {
  createPool: (options: Record<string, unknown>) => Promise<any>;
};

export interface ReadOnlyQueryResult {
  queryId: string;
  rows: unknown[];
  rowCount: number;
  columns: string[];
  durationMs: number;
}

export interface OracleCredentials {
  user: string;
  password: string;
}

let oraclePool: any;
let oraclePoolKey = "";
let oraclePoolPromise: Promise<any> | undefined;

function requireCredentials(credentials: OracleCredentials): void {
  if (!credentials.user.trim() || !credentials.password) {
    throw new Error("Usuário e senha Oracle são obrigatórios.");
  }
}

async function openConnection(credentials: OracleCredentials) {
  const config = getOracleConfig();
  requireCredentials(credentials);
  const connectString = `${config.host}:${config.port}/${config.serviceName}`;
  const poolKey = `${credentials.user.trim()}\u0000${credentials.password}\u0000${connectString}`;

  if (oraclePool && oraclePoolKey === poolKey) return oraclePool.getConnection();
  if (oraclePoolPromise) await oraclePoolPromise;
  if (oraclePool && oraclePoolKey !== poolKey) {
    await oraclePool.close(0).catch(() => undefined);
    oraclePool = undefined;
    oraclePoolKey = "";
  }

  if (!oraclePool) {
    oraclePoolPromise = oracleDriver.createPool({
      user: credentials.user.trim(),
      password: credentials.password,
      connectString,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1,
    });
    try {
      oraclePool = await oraclePoolPromise;
      oraclePoolKey = poolKey;
    } finally {
      oraclePoolPromise = undefined;
    }
  }

  return oraclePool.getConnection();
}

export function getOracleConnectionStatus(): { poolActive: boolean } {
  return { poolActive: Boolean(oraclePool) };
}

export async function closeOraclePool(): Promise<void> {
  if (!oraclePool) return;
  const pool = oraclePool;
  oraclePool = undefined;
  oraclePoolKey = "";
  await pool.close(0).catch(() => undefined);
}

export async function testOracleConnection(credentials: OracleCredentials): Promise<void> {
  const config = getOracleConfig();
  assertSafeOracleConfig(config);
  const connection = await openConnection(credentials);
  await connection.close();
}

export async function executeAllowlistedSelect(
  queryId: string,
  binds: Record<string, unknown> = {},
  credentials?: OracleCredentials,
): Promise<ReadOnlyQueryResult> {
  const config = getOracleConfig();
  assertSafeOracleConfig(config);

  if (!config.liveReadsEnabled) {
    throw new Error(
      "Leituras live estão desabilitadas. Ative ORACLE_LIVE_READS_ENABLED somente após validar a allowlist.",
    );
  }

  const catalogEntry = await getAllowlistedQuery(queryId);
  const sql = await loadCatalogSql(catalogEntry);
  assertSelectOnly(sql);

  const activeCredentials = credentials ?? { user: config.user, password: config.password };
  if (!activeCredentials.user || !activeCredentials.password) {
    throw new Error(
      "ORACLE_USER e ORACLE_PASSWORD precisam estar configurados localmente.",
    );
  }

  const connection = await openConnection(activeCredentials);
  connection.callTimeout = (catalogEntry.timeoutSeconds ?? 30) * 1_000;
  const startedAt = performance.now();

  try {
    await connection.execute("SET TRANSACTION READ ONLY", {}, { autoCommit: false });
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: false,
      maxRows: catalogEntry.maxRows ?? 5_000,
    });

    const rows = (result.rows ?? []) as unknown[];

    return {
      queryId: catalogEntry.id,
      rows,
      rowCount: rows.length,
      columns: result.metaData?.map((column: { name?: string }) => column.name ?? "") ?? [],
      durationMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    await connection.rollback().catch(() => undefined);
    await connection.close();
  }
}
