import type { ValidationStatus } from "@mifc/domain";
import type { LayoutNode } from "@/stores/mifc-layout";

export type LayoutClientKey = "FH" | "VM" | "SCA" | "DAF";

export interface ClientProcessStage {
  id: string;
  label: string;
  layoutNodeId: string;
}

export interface ClientStageMapping {
  stageId: string;
  participates: boolean;
  processMeasureKeys: string[];
  stockMeasureKeys: string[];
  validationStatus: ValidationStatus;
  evidence: string;
}

export interface ClientProcessLane {
  key: LayoutClientKey;
  label: string;
  totalMeasureKey: string;
  mappings: ClientStageMapping[];
}

export interface PositionedClientStage extends ClientProcessStage {
  centerX: number;
  width: number;
}

export const clientProcessStages: ClientProcessStage[] = [
  { id: "lct-rf2", label: "LCT / RF2", layoutNodeId: "node-cut" },
  { id: "rf3", label: "Roll Former 3", layoutNodeId: "node-stamp" },
  { id: "mesa-3", label: "Mesa 3", layoutNodeId: "node-weld-1" },
  { id: "beattys", label: "Beattys", layoutNodeId: "node-weld-2" },
  { id: "pa-cnc", label: "P.A / CNC", layoutNodeId: "node-weld-3" },
  { id: "paint-rework", label: "Pintura / Rebitagem", layoutNodeId: "node-assembly" },
  { id: "shipping", label: "Stenhoj / Embalagem", layoutNodeId: "node-inspection" },
];

const mapped = (
  stageId: string,
  processMeasureKeys: string[],
  stockMeasureKeys: string[],
  evidence: string,
  validationStatus: ValidationStatus = "mapped",
): ClientStageMapping => ({
  stageId,
  participates: processMeasureKeys.length > 0,
  processMeasureKeys,
  stockMeasureKeys,
  validationStatus,
  evidence,
});

export const clientProcessLanes: ClientProcessLane[] = [
  {
    key: "FH",
    label: "Volvo FH",
    totalMeasureKey: "T-T-FH",
    mappings: [
      mapped("lct-rf2", ["T-LCT/RF2"], ["E-D-P-LCT", "E-D-P-RF2"], "PBIP: Volvo FH — tempo de processo/estoque"),
      mapped("rf3", ["T-RF3"], ["E-P-D-FH-RF3"], "PBIP: Roll Former 3 filtrado para FH"),
      mapped("mesa-3", ["T-M3"], ["E-P-D-FH-M3"], "PBIP: Mesa 3 no contexto FH"),
      mapped("beattys", ["T-B4"], ["D-E-FH-B"], "PBIP: Beatty 4 e estoque FH Beattys"),
      mapped("pa-cnc", ["T-P.A"], ["D-E-FH-P.A", "D-E-FH-CL"], "PBIP: P.A e Cantilever FH"),
      mapped("paint-rework", ["T-LPP2"], ["D-E-FH-P.I"], "PBIP: Pintura e estoque de entrada FH"),
      mapped("shipping", ["T-STJ"], ["E-P-D-FH-STJ", "E-P-D-FH-EMB"], "PBIP: Stenhoj e embalagem FH"),
    ],
  },
  {
    key: "VM",
    label: "Volvo VM",
    totalMeasureKey: "T-T-VM",
    mappings: [
      mapped("lct-rf2", [], [], "Sem medida de processo VM para LCT/RF2 no catálogo PBIP", "validated"),
      mapped("rf3", ["T-RF3"], ["E-P-D-VM-RF3"], "PBIP: Roll Former 3 filtrado para VM"),
      {
        ...mapped("mesa-3", ["T-M3"], [], "T-M3 aparece como cartão, mas não compõe T-T-VM; confirmação operacional pendente", "pending"),
        participates: false,
      },
      mapped("beattys", ["T-B1"], ["D-E-VM-B"], "PBIP: Beatty 1 e estoque VM Beattys"),
      mapped("pa-cnc", ["T-CNC"], ["D-E-VM-CL"], "PBIP: CNC e Cantilever VM"),
      mapped("paint-rework", ["T-LPP2"], ["D-E-VM-P.I"], "PBIP: Pintura e estoque de entrada VM"),
      mapped("shipping", ["T-EMB-VM"], ["E-P-D-VM-EMB"], "PBIP: tempo e estoque de embalagem VM"),
    ],
  },
  {
    key: "SCA",
    label: "Scania",
    totalMeasureKey: "T-T-SCA",
    mappings: [
      mapped("lct-rf2", [], [], "Sem medida de processo Scania para LCT/RF2 no catálogo PBIP", "validated"),
      mapped("rf3", ["T-RF3"], ["E-P-D-SCA-RF3"], "PBIP: Roll Former 3 filtrado para Scania"),
      mapped("mesa-3", ["T-M3"], ["E-P-D-SCA-M3"], "PBIP: Mesa 3 no contexto Scania"),
      mapped("beattys", ["T-B3"], ["D-E-SCA-B"], "PBIP: Beatty 3 e estoque Scania Beattys"),
      mapped("pa-cnc", ["T-P.A"], ["D-E-SCA-P.A", "D-E-SCA-CL"], "PBIP: P.A e Cantilever Scania"),
      mapped("paint-rework", ["T-LPP2", "T-SCA-REB"], ["D-E-SCA-P.I", "D-E-SCA-REB"], "PBIP: pintura e rebitagem Scania"),
      mapped("shipping", ["T-STJ"], ["E-P-D-SCA-STJ", "E-P-D-SCA-EMB"], "PBIP: Stenhoj e embalagem Scania"),
    ],
  },
  {
    key: "DAF",
    label: "DAF",
    totalMeasureKey: "T-T-DAF",
    mappings: [
      mapped("lct-rf2", [], [], "Sem medida de processo DAF para LCT/RF2 no catálogo PBIP", "validated"),
      mapped("rf3", ["T-RF3"], ["E-P-D-DAF-RF3"], "PBIP: Roll Former 3 filtrado para DAF"),
      mapped("mesa-3", ["T-M3"], ["E-P-D-DAF-M3"], "PBIP: Mesa 3 no contexto DAF"),
      mapped("beattys", ["T-B1"], ["D-E-DAF-B"], "PBIP: Beatty 1 e estoque DAF Beattys"),
      mapped("pa-cnc", ["T-CNC"], ["D-E-DAF-CL"], "PBIP: CNC e Cantilever DAF"),
      mapped("paint-rework", ["T-LPP2", "T-DAF-REB"], ["D-E-DAF-P.I", "D-E-DAF-REB"], "PBIP: pintura e rebitagem DAF"),
      mapped("shipping", ["T-STJ"], ["E-P-D-DAF-STJ", "E-P-D-DAF-EMB"], "PBIP: Stenhoj e embalagem DAF"),
    ],
  },
];

export function positionClientStages(nodes: LayoutNode[]): PositionedClientStage[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return clientProcessStages.map((stage, index) => {
    const node = nodeMap.get(stage.layoutNodeId)
      ?? nodes.find((item) => item.id.endsWith(`-${stage.layoutNodeId}`))
      ?? nodes.find((item) => item.label === stage.label);
    return {
      ...stage,
      layoutNodeId: node?.id ?? stage.layoutNodeId,
      centerX: node ? node.x + node.width / 2 : 330 + index * 152,
      width: node?.width ?? 108,
    };
  });
}

export function buildClientProcessPath(
  lane: ClientProcessLane,
  stages: PositionedClientStage[],
  baseline = 23,
  raised = 7,
): string {
  if (!stages.length) return "";
  const mappings = new Map(lane.mappings.map((mapping) => [mapping.stageId, mapping]));
  const start = Math.max(0, stages[0].centerX - stages[0].width / 2);
  let path = `M ${start} ${baseline}`;
  for (const stage of stages) {
    const halfPulse = Math.min(32, Math.max(18, stage.width * 0.28));
    const before = stage.centerX - halfPulse;
    const after = stage.centerX + halfPulse;
    path += ` L ${before} ${baseline}`;
    if (mappings.get(stage.id)?.participates) {
      path += ` L ${before} ${raised} L ${after} ${raised} L ${after} ${baseline}`;
    } else {
      path += ` L ${after} ${baseline}`;
    }
  }
  const last = stages.at(-1)!;
  return `${path} L ${last.centerX + last.width / 2} ${baseline}`;
}
