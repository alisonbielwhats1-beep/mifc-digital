import { describe, expect, it } from "vitest";
import { calculateTableDelta, reachedRowLimit, selectSyncCandidates } from "../../../api/src/oracle/sync-policy.js";
import type { QueryCatalogEntry } from "../../../api/src/oracle/query-catalog.js";

const entry = (overrides: Partial<QueryCatalogEntry>): QueryCatalogEntry => ({
  id: "base1",
  powerBiObject: "Base1",
  sourceFile: "modelo.tmdl",
  sourceType: "oracle",
  queryMode: "embedded-sql",
  status: "confirmed-pbip",
  enabled: true,
  usedBy: ["FH"],
  ...overrides,
});

describe("sincronização das tabelas Oracle aprovadas", () => {
  it("seleciona apenas SQL aprovado e com uso mapeado", () => {
    const selected = selectSyncCandidates([
      entry({ id: "base1" }),
      entry({ id: "sem-uso", usedBy: [] }),
      entry({ id: "pendente", enabled: false }),
      entry({ id: "navegacao", queryMode: "navigation-m" }),
    ]);

    expect(selected.map((item) => item.id)).toEqual(["base1"]);
  });

  it("sinaliza quando a leitura alcança o limite configurado", () => {
    expect(reachedRowLimit(5_000, 5_000)).toBe(true);
    expect(reachedRowLimit(4_999, 5_000)).toBe(false);
  });

  it("calcula inclusões e remoções sem depender da ordem das colunas", () => {
    const delta = calculateTableDelta(
      [{ ID: 1, STATUS: "A" }, { ID: 2, STATUS: "A" }],
      [{ STATUS: "A", ID: 1 }, { ID: 2, STATUS: "B" }, { ID: 3, STATUS: "A" }],
    );

    expect(delta).toEqual({ added: 2, removed: 1, unchanged: 1, changed: true });
  });
});
