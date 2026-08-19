import { describe, expect, it } from "vitest";
import { buildClientProcessPath, clientProcessLanes, clientProcessStages, positionClientStages } from "./client-process-matrix";
import type { LayoutNode } from "@/stores/mifc-layout";

function stageNodes(): LayoutNode[] {
  return clientProcessStages.map((stage, index) => ({
    id: stage.layoutNodeId,
    revisionId: "test",
    type: "process",
    label: stage.label,
    x: 100 + index * 150,
    y: 100,
    width: 100,
    height: 70,
    layer: 10,
    properties: { code: "", cycleTimeSeconds: 0, wipPieces: 0, capacityPerDay: 0, shifts: 2, availabilityPercent: 90, notes: "", calculationKey: "" },
    sourceVisualIds: [],
    validationStatus: "mapped",
  }));
}

describe("matriz cliente × processo do Layout", () => {
  it("mantém os quatro clientes e as sete etapas alinhadas aos blocos", () => {
    expect(clientProcessLanes.map((lane) => lane.key)).toEqual(["FH", "VM", "SCA", "DAF"]);
    expect(clientProcessStages).toHaveLength(7);
    expect(positionClientStages(stageNodes()).map((stage) => stage.centerX)).toEqual([150, 300, 450, 600, 750, 900, 1050]);
  });

  it("mantém o alinhamento quando uma nova revisão prefixa os IDs", () => {
    const nodes = stageNodes().map((node) => ({ ...node, id: `layout-rev-05-${node.id}` }));
    const positioned = positionClientStages(nodes);
    expect(positioned[1]).toMatchObject({ layoutNodeId: "layout-rev-05-node-stamp", centerX: 300 });
  });

  it("faz todos os clientes subirem no Roll Former 3", () => {
    for (const lane of clientProcessLanes) {
      expect(lane.mappings.find((mapping) => mapping.stageId === "rf3")).toMatchObject({ participates: true, processMeasureKeys: ["T-RF3"] });
    }
  });

  it("mapeia cada cliente para a Beatty definida pelo PBIP", () => {
    const measures = Object.fromEntries(clientProcessLanes.map((lane) => [lane.key, lane.mappings.find((mapping) => mapping.stageId === "beattys")?.processMeasureKeys]));
    expect(measures).toEqual({ FH: ["T-B4"], VM: ["T-B1"], SCA: ["T-B3"], DAF: ["T-B2"] });
  });

  it("mantém Volvo VM reto na Mesa 3 e sinaliza a validação pendente", () => {
    const vm = clientProcessLanes.find((lane) => lane.key === "VM")!;
    expect(vm.mappings.find((mapping) => mapping.stageId === "mesa-3")).toMatchObject({ participates: false, validationStatus: "pending", processMeasureKeys: ["T-M3"] });

    const mesa = positionClientStages(stageNodes()).find((stage) => stage.id === "mesa-3")!;
    const path = buildClientProcessPath(vm, [mesa]);
    expect(path).not.toContain(" 7");
    expect(path).toContain(" 23");
  });

  it("gera uma subida somente quando a etapa participa", () => {
    const fh = clientProcessLanes.find((lane) => lane.key === "FH")!;
    const rf3 = positionClientStages(stageNodes()).find((stage) => stage.id === "rf3")!;
    expect(buildClientProcessPath(fh, [rf3])).toContain(" 7");
  });
});
