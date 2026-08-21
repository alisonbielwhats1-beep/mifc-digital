import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractEmbeddedSqlFromTmdl, extractNavigationTargetFromTmdl, fingerprintSql, materializeNavigationSelect, normalizeSql } from "../../../api/src/oracle/source-query.js";
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
  it("mantém os quatro objetos físicos validados pelo PBIP com suas assinaturas", async () => {
    const content = await readFile(new URL("../../../api/config/oracle-query-catalog.json", import.meta.url), "utf8");
    const catalog = JSON.parse(content) as Array<{ id:string; expectedSchema?:string; expectedSourceObject?:string; expectedFingerprint?:string }>;
    const expected:Record<string,string> = {
      "bi-oee-scrap":"BI_HEATMAP_SCRAP", lotes:"BI_MFIC_LOTES", paradas:"BI_MFIC_PARADAS", producao:"BI_MFIC_PROD",
    };
    for (const [id, object] of Object.entries(expected)) {
      const entry = catalog.find((item) => item.id === id)!;
      expect(entry.expectedSchema).toBe("BOMES");
      expect(entry.expectedSourceObject).toBe(object);
      expect(entry.expectedFingerprint).toBe(fingerprintSql(`SELECT * FROM "BOMES"."${object}"`));
    }
  });

  it("decodifica a string M e normaliza o SQL antes da assinatura", () => {
    const tmdl = 'expression Base1 = Oracle.Database("MESBR", [Query="SELECT #(lf)  \""CODIGO\"" #(lf)FROM DUAL"])';
    const sql = extractEmbeddedSqlFromTmdl(tmdl, "Base1");
    expect(normalizeSql(sql)).toBe('SELECT\n  "CODIGO"\nFROM DUAL');
    expect(fingerprintSql(sql)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("materializa navegação M apenas para o schema e objeto aprovados", () => {
    const tmdl = `expression BI_PUNCH_SCA =\n let\n Fonte = Oracle.Database("MES", [HierarchicalNavigation=true]),\n BOMES = Fonte{[Schema="BOMES"]}[Data],\n BI_PUNCH_SCA1 = BOMES{[Name="BI_PUNCH_SCA"]}[Data]\n in BI_PUNCH_SCA1`;
    expect(extractNavigationTargetFromTmdl(tmdl, "BI_PUNCH_SCA")).toEqual({ schema: "BOMES", object: "BI_PUNCH_SCA" });
    expect(materializeNavigationSelect(tmdl, {
      powerBiObject: "BI_PUNCH_SCA",
      expectedSchema: "BOMES",
      expectedSourceObject: "BI_PUNCH_SCA",
    })).toBe('SELECT * FROM "BOMES"."BI_PUNCH_SCA"');
  });

  it("rejeita navegação M que aponta para outro objeto", () => {
    const tmdl = `table Produção\n partition Produção = m\n source = let\n Fonte = Oracle.Database("MES"),\n BOMES = Fonte{[Schema="BOMES"]}[Data],\n Outro = BOMES{[Name="OUTRO"]}[Data]\n in Outro`;
    expect(() => materializeNavigationSelect(tmdl, {
      powerBiObject: "Produção",
      expectedSchema: "BOMES",
      expectedSourceObject: "PRODUCAO",
    })).toThrow(/Objeto divergente/);
  });
});
