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

  it("expõe todas as 42 medidas de buffer em dias catalogadas no Power BI", () => {
    const nodes = ["node-raw", "node-cut", "node-stamp", "node-weld-1", "node-beatty-4", "node-weld-2", "node-beatty-3", "node-beatty-2", "node-weld-3", "node-assembly", "node-inspection"]
      .map((id, index) => node(id, 150 + index * 220, 455));
    const expected = [
      "D-E-DAF-B", "D-E-DAF-CL", "D-E-DAF-P.I", "D-E-DAF-REB",
      "D-E-FH-B", "D-E-FH-CL", "D-E-FH-P.A", "D-E-FH-P.I",
      "D-E-SCA-B", "D-E-SCA-CL", "D-E-SCA-P.A", "D-E-SCA-P.I", "D-E-SCA-REB",
      "D-E-VM-B", "D-E-VM-CL", "D-E-VM-P.I",
      "E-D-P-LCT", "E-D-P-RF2",
      "E-P-D-DAF-EMB", "E-P-D-DAF-M3", "E-P-D-DAF-RF3", "E-P-D-DAF-STJ",
      "E-P-D-FH-EMB", "E-P-D-FH-M3", "E-P-D-FH-RF3", "E-P-D-FH-STJ",
      "E-P-D-SCA-EMB", "E-P-D-SCA-M3", "E-P-D-SCA-RF3", "E-P-D-SCA-STJ",
      "E-P-D-VM-EMB", "E-P-D-VM-RF3",
      "Q-D-DAF", "Q-D-FH", "Q-D-SCA", "Q-D-VM",
      "Q-D-S-EMB", "Q-D-S-LPP2", "Q-D-S-RF2", "Q-D-S-RF3", "Q-D-S-STJ", "Q-D-S-T",
    ].sort();

    const actual = buildLayoutMeasureBuffers(nodes, {})
      .flatMap((buffer) => buffer.values.map((value) => value.measureKey))
      .sort();

    expect(actual).toEqual(expected);
  });
});
