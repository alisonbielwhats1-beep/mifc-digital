import "dotenv/config";
import { readStoredOracleCredentials } from "./oracle/credentials-store.js";

export interface OracleConfig {
  pbipPath: string;
  host: string;
  port: number;
  serviceName: string;
  user: string;
  password: string;
  credentialsSource: "environment" | "local-store" | "none";
  readOnly: boolean;
  liveReadsEnabled: boolean;
  autoRefreshSeconds: number;
  catalogPath: string;
  apiPort: number;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

export function getOracleConfig(): OracleConfig {
  const storedCredentials = readStoredOracleCredentials();
  const environmentUser = process.env.ORACLE_USER?.trim() ?? "";
  const environmentPassword = process.env.ORACLE_PASSWORD ?? "";
  const hasEnvironmentCredentials = Boolean(environmentUser && environmentPassword);
  const user = hasEnvironmentCredentials ? environmentUser : storedCredentials?.user ?? "";
  const password = hasEnvironmentCredentials ? environmentPassword : storedCredentials?.password ?? "";
  return {
    pbipPath: process.env.MIFC_PBIP_PATH ?? "../mifc-pbip",
    host: process.env.ORACLE_HOST ?? "10.44.34.68",
    port: Number(process.env.ORACLE_PORT ?? "1522"),
    serviceName: process.env.ORACLE_SERVICE_NAME ?? "MESBR",
    user,
    password,
    credentialsSource: hasEnvironmentCredentials ? "environment" : user && password ? "local-store" : "none",
    readOnly: readBoolean("ORACLE_READ_ONLY", true),
    liveReadsEnabled: readBoolean("ORACLE_LIVE_READS_ENABLED", false),
    autoRefreshSeconds: Number(process.env.ORACLE_AUTO_REFRESH_SECONDS ?? "300"),
    catalogPath:
      process.env.ORACLE_QUERY_CATALOG_PATH ??
      "apps/api/config/oracle-query-catalog.json",
    apiPort: Number(process.env.API_PORT ?? "5174"),
  };
}

export function assertSafeOracleConfig(config: OracleConfig): void {
  if (!config.readOnly) {
    throw new Error(
      "Proteção recusada: ORACLE_READ_ONLY precisa permanecer true.",
    );
  }

  if (!Number.isInteger(config.port) || config.port <= 0) {
    throw new Error("ORACLE_PORT inválida.");
  }
  if (!Number.isInteger(config.apiPort) || config.apiPort <= 0) throw new Error("API_PORT inválida.");
  if (!Number.isInteger(config.autoRefreshSeconds) || config.autoRefreshSeconds < 60) {
    throw new Error("ORACLE_AUTO_REFRESH_SECONDS precisa ser um número inteiro de pelo menos 60 segundos.");
  }
}
