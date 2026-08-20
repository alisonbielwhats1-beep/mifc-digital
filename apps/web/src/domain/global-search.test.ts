import { describe, expect, it } from "vitest";
import { searchGlobal, type GlobalSearchDocument } from "@/domain/global-search";

const documents: GlobalSearchDocument[] = [
  { id: "node-rf3", type: "Bloco do Layout", label: "Roll Former 3", description: "Processo P-001", keywords: ["RF3", "T-RF3"], route: "/mifc/layout", focus: "node-rf3" },
  { id: "measure-rf3", type: "Medida Power BI", label: "T-RF3", description: "Tempo de Rollformer 3", keywords: ["tempo", "medida"], route: "/mifc/layout" },
  { id: "product", type: "Produto", label: "Longarina Scania", description: "Produto", keywords: ["SCANIA"], route: "/products" },
];

describe("busca global do MIFC", () => {
  it("encontra bloco por código e prioriza correspondência no título", () => {
    expect(searchGlobal(documents, "rf3").map((item) => item.id)).toEqual(["measure-rf3", "node-rf3"]);
  });

  it("ignora acentos e retorna rota com foco", () => {
    const [result] = searchGlobal(documents, "longarina scânia");
    expect(result.route).toBe("/products");
    expect(result.id).toBe("product");
  });
});
