import { describe, expect, it } from "vitest";
import { buildClientProcessPath, clientProcessLanes, clientProcessStages, mappingForClientStage, positionClientLaneMeasures, positionClientStages } from "./client-process-matrix";
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
  it("mantém os quatro clientes e as máquinas físicas alinhadas aos blocos", () => {
    expect(clientProcessLanes.map((lane) => lane.key)).toEqual(["FH", "VM", "SCA", "DAF"]);
    expect(clientProcessStages).toHaveLength(14);
    expect(positionClientStages(stageNodes()).map((stage) => stage.centerX)).toEqual([150, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500, 1650, 1800, 1950, 2100]);
  });

  it("mantém o alinhamento quando uma nova revisão prefixa os IDs", () => {
    const nodes = stageNodes().map((node) => ({ ...node, id: `layout-rev-05-${node.id}` }));
    const positioned = positionClientStages(nodes);
    expect(positioned[1]).toMatchObject({ layoutNodeId: "layout-rev-05-node-rf2", centerX: 300 });
  });

  it("faz todos os clientes subirem no Roll Former 3", () => {
    for (const lane of clientProcessLanes) {
      expect(lane.mappings.find((mapping) => mapping.stageId === "rf3")).toMatchObject({ participates: true, processMeasureKeys: ["T-RF3"] });
    }
  });

  it("mapeia cada cliente para a Beatty definida pelo PBIP", () => {
    const beattyStages = clientProcessStages.filter((stage) => stage.id.startsWith("beatty-"));
    const activeStage = Object.fromEntries(clientProcessLanes.map((lane) => [
      lane.key,
      beattyStages.find((stage) => mappingForClientStage(lane, stage)?.participates)?.id,
    ]));
    expect(activeStage).toEqual({ FH: "beatty-4", VM: "beatty-1", SCA: "beatty-3", DAF: "beatty-2" });
  });

  it("move somente o pico da Beatty física reposicionada", () => {
    const nodes = stageNodes();
    const before = positionClientStages(nodes);
    const beatty4 = nodes.find((node) => node.id === "node-beatty-4")!;
    beatty4.x += 240;
    const after = positionClientStages(nodes);

    expect(after.find((stage) => stage.id === "beatty-4")!.centerX)
      .toBe(before.find((stage) => stage.id === "beatty-4")!.centerX + 240);
    for (const stageId of ["beatty-1", "beatty-2", "beatty-3"]) {
      expect(after.find((stage) => stage.id === stageId)!.centerX)
        .toBe(before.find((stage) => stage.id === stageId)!.centerX);
    }
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

  it("posiciona transporte, Slitter e todos os buffers na linha do cliente", () => {
    const nodes = [
      ...stageNodes(),
      { ...stageNodes()[0], id: "node-beneficiator", label: "Beneficiador", x: 225, width: 110 },
      { ...stageNodes()[0], id: "node-raw", label: "Almox. Matéria-prima", x: 440, width: 110 },
    ];
    const stages = positionClientStages(nodes);
    const daf = clientProcessLanes.find((lane) => lane.key === "DAF")!;
    const measures = positionClientLaneMeasures(daf, stages, nodes);

    expect(measures.find((item) => item.measureKey === "T-B")).toMatchObject({ kind: "manual", centerX: 280 });
    expect(measures.find((item) => item.measureKey === "T-T")).toMatchObject({ kind: "manual", centerX: 387.5 });
    expect(measures.find((item) => item.measureKey === "Q-D-DAF")).toMatchObject({ kind: "stock", centerX: 495 });
    expect(measures.map((item) => item.measureKey)).toEqual(expect.arrayContaining([
      "T-RF3", "E-P-D-DAF-RF3", "T-M3", "E-P-D-DAF-M3", "T-B2", "D-E-DAF-B",
      "T-CNC", "D-E-DAF-CL", "T-LPP2", "T-DAF-REB", "D-E-DAF-P.I", "D-E-DAF-REB",
      "T-STJ", "E-P-D-DAF-STJ", "E-P-D-DAF-EMB",
    ]));
  });
});
