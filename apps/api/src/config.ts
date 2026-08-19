import "dotenv/config";

export interface OracleConfig {
  pbipPath: string;
  host: string;
  port: number;
  serviceName: string;
  user: string;
  password: string;
  readOnly: boolean;
  liveReadsEnabled: boolean;
  catalogPath: string;
  apiPort: number;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

export function getOracleConfig(): OracleConfig {
  return {
    pbipPath: process.env.MIFC_PBIP_PATH ?? "C:\\Users\\Usuário\\Downloads\\MIFC",
    host: process.env.ORACLE_HOST ?? "10.44.34.68",
    port: Number(process.env.ORACLE_PORT ?? "1522"),
    serviceName: process.env.ORACLE_SERVICE_NAME ?? "MESBR",
    user: process.env.ORACLE_USER ?? "",
    password: process.env.ORACLE_PASSWORD ?? "",
    readOnly: readBoolean("ORACLE_READ_ONLY", true),
    liveReadsEnabled: readBoolean("ORACLE_LIVE_READS_ENABLED", false),
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
}
