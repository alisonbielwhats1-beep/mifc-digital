import { describe, expect, it } from "vitest";
import { buildLayoutMeasureBuffers } from "@/domain/layout-measure-buffers";
import type { LayoutNode } from "@/stores/mifc-layout";

const node = (id: string, x: number, y: number): LayoutNode => ({
  id,
  revisionId: "layout-rev-test",
  type: "process",
  label: id,
  x,
  y,
  width: 136,
  height: 90,
  layer: 10,
  properties: {
    code: id,
    cycleTimeSeconds: 0,
    wipPieces: 0,
    capacityPerDay: 0,
    shifts: 2,
    availabilityPercent: 90,
    notes: "",
    calculationKey: "",
  },
  sourceVisualIds: [],
  validationStatus: "mapped",
});

describe("buffers automáticos posicionados no fluxograma", () => {
  it("ancora Slitter, RF3 e Beatty 4 exatamente aos respectivos blocos", () => {
    const nodes = [
      node("node-raw", 150, 455),
      node("node-stamp", 500, 455),
      node("node-beatty-4", 890, 400),
    ];
    const values = {
      "Q-D-FH": 2.5,
      "E-P-D-FH-RF3": 0.4,
      "D-E-FH-B": 0.6,
    };

    const buffers = buildLayoutMeasureBuffers(nodes, values);

    expect(buffers.find((item) => item.id === "slitter")).toMatchObject({
      anchorNodeId: "node-raw",
      x: 150,
      values: expect.arrayContaining([expect.objectContaining({ clientKey: "FH", measureKey: "Q-D-FH", value: 2.5 })]),
    });
    expect(buffers.find((item) => item.id === "rf3")).toMatchObject({
      anchorNodeId: "node-stamp",
      values: expect.arrayContaining([expect.objectContaining({ measureKey: "E-P-D-FH-RF3", value: 0.4 })]),
    });
    expect(buffers.find((item) => item.id === "beatty-4")).toMatchObject({
      anchorNodeId: "node-beatty-4",
      values: expect.arrayContaining([expect.objectContaining({ measureKey: "D-E-FH-B", value: 0.6 })]),
    });
  });

  it("acompanha a máquina quando o bloco é movido", () => {
    const original = buildLayoutMeasureBuffers([node("node-beatty-4", 890, 400)], {});
    const moved = buildLayoutMeasureBuffers([node("node-beatty-4", 1040, 530)], {});

    expect(moved.find((item) => item.id === "beatty-4")?.x)
      .toBe((original.find((item) => item.id === "beatty-4")?.x ?? 0) + 150);
    expect(moved.find((item) => item.id === "beatty-4")?.y)
      .toBe((original.find((item) => item.id === "beatty-4")?.y ?? 0) + 130);
  });
});
