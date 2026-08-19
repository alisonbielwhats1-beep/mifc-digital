import { describe, expect, it } from "vitest";
import { beginNodePointerSelection, finishNodePointerSelection } from "./layout-selection";

describe("seleção e arraste de blocos do Layout", () => {
  const beattys = ["node-beatty-1", "node-beatty-2", "node-beatty-3", "node-beatty-4"];

  it("move somente a Beatty clicada quando o arraste começa sem modificador", () => {
    expect(beginNodePointerSelection(beattys, "node-beatty-3", false)).toEqual({
      selectedIds: ["node-beatty-3"],
      movingIds: ["node-beatty-3"],
      toggleOffOnClick: false,
    });
  });

  it("move o grupo apenas quando o arraste começa com Ctrl ou Shift", () => {
    expect(beginNodePointerSelection(beattys, "node-beatty-3", true).movingIds).toEqual(beattys);
  });

  it("remove um bloco da seleção com Ctrl/Shift + clique, sem arraste", () => {
    expect(finishNodePointerSelection(beattys, "node-beatty-3", true, false)).toEqual([
      "node-beatty-1", "node-beatty-2", "node-beatty-4",
    ]);
  });

  it("preserva o grupo depois de um arraste com Ctrl/Shift", () => {
    expect(finishNodePointerSelection(beattys, "node-beatty-3", true, true)).toEqual(beattys);
  });
});
