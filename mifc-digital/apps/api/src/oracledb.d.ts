declare module "oracledb" {
  interface ExecuteResult {
    rows?: unknown[];
    rowsAffected?: number;
    metaData?: Array<{ name: string }>;
  }

  interface Connection {
    callTimeout: number;
    execute(
      sql: string,
      binds: Record<string, unknown>,
      options: { outFormat?: number; autoCommit: false; maxRows?: number },
    ): Promise<ExecuteResult>;
    rollback(): Promise<void>;
    close(): Promise<void>;
  }

  interface OracleDb {
    readonly OUT_FORMAT_OBJECT: number;
    getConnection(config: {
      user: string;
      password: string;
      connectString: string;
    }): Promise<Connection>;
  }

  const oracledb: OracleDb;
  export default oracledb;
}
