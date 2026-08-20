import { describe, expect, it } from "vitest";
import { positionLayoutBuffers } from "@/domain/layout-buffers";
import type { LayoutNode } from "@/stores/mifc-layout";

const node = (id: string, label: string, x: number): LayoutNode => ({
  id,
  revisionId: "r1",
  type: "process",
  label,
  x,
  y: 200,
  width: 100,
  height: 70,
  layer: 10,
  properties: { code: "", cycleTimeSeconds: 0, wipPieces: 0, capacityPerDay: 0, shifts: 2, availabilityPercent: 90, notes: "", calculationKey: "" },
  sourceVisualIds: [],
  validationStatus: "mapped",
});

describe("buffers auditáveis no Layout", () => {
  it("posiciona o símbolo entre os processos e acompanha seu movimento", () => {
    const rows = [{ id: "buffer-1", customer: "FH", point: "Pós RF3", direction: "saída" as const, type: "processo" as const, quantityPieces: 20, capacityPieces: 50, pairsPerDay: 10, inputProcess: "Roll Former 3", outputProcess: "Mesa 3", origin: "INPUT" as const, status: "active" as const }];
    const nodes = [node("rf3", "Roll Former 3", 100), node("mesa", "Mesa 3", 400)];
    const first = positionLayoutBuffers(rows, nodes)[0];
    nodes[1].x = 600;
    const moved = positionLayoutBuffers(rows, nodes)[0];

    expect(first.inputNodeId).toBe("rf3");
    expect(first.outputNodeId).toBe("mesa");
    expect(first.wipDays).toBe(1);
    expect(moved.x).toBeGreaterThan(first.x);
  });

  it("mantém o tempo pendente quando o WIP observado não está disponível", () => {
    const rows = [{ id: "buffer-2", customer: "DAF", point: "Embalagem", direction: "entrada" as const, type: "processo" as const, quantityPieces: null, capacityPieces: 50, pairsPerDay: 10, inputProcess: "Stenhoj", outputProcess: "Embalagem", origin: "ORACLE_MES" as const, status: "active" as const }];
    const positioned = positionLayoutBuffers(rows, [node("stj", "Stenhoj / Embalagem", 400)])[0];

    expect(positioned.wipDays).toBeUndefined();
  });
});
