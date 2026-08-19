import { describe, expect, it } from "vitest";
import { selectSyncCandidates } from "../../../api/src/oracle/sync-policy.js";
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
});
