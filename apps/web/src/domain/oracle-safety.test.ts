import { describe, expect, it } from "vitest";
import { extractEmbeddedSqlFromTmdl, fingerprintSql, normalizeSql } from "../../../api/src/oracle/source-query.js";
import { assertSelectOnly } from "../../../api/src/oracle/sql-policy.js";

describe("política Oracle somente leitura", () => {
  it.each([
    "UPDATE tabela SET valor = 1",
    "SELECT * FROM tabela FOR UPDATE",
    "BEGIN DBMS_OUTPUT.PUT_LINE('x'); END;",
    "SELECT * FROM tabela; DELETE FROM tabela",
    "SELECT UTL_HTTP.REQUEST('https://example.com') FROM dual",
  ])("bloqueia operação insegura: %s", (sql) => {
    expect(() => assertSelectOnly(sql)).toThrow();
  });

  it.each([
    "SELECT coluna FROM tabela",
    "WITH base AS (SELECT 1 valor FROM dual) SELECT valor FROM base",
  ])("aceita leitura única: %s", (sql) => {
    expect(() => assertSelectOnly(sql)).not.toThrow();
  });
});

describe("extração e assinatura do PBIP", () => {
  it("decodifica a string M e normaliza o SQL antes da assinatura", () => {
    const tmdl = 'expression Base1 = Oracle.Database("MESBR", [Query="SELECT #(lf)  \""CODIGO\"" #(lf)FROM DUAL"])';
    const sql = extractEmbeddedSqlFromTmdl(tmdl, "Base1");
    expect(normalizeSql(sql)).toBe('SELECT\n  "CODIGO"\nFROM DUAL');
    expect(fingerprintSql(sql)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
