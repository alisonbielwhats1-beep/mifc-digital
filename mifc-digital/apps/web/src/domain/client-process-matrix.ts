import type { ValidationStatus } from "@mifc/domain";
import type { LayoutNode } from "@/stores/mifc-layout";

export type LayoutClientKey = "FH" | "VM" | "SCA" | "DAF";

export interface ClientProcessStage {
  id: string;
  label: string;
  layoutNodeId: string;
  relatedLayoutNodeIds?: string[];
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

export interface PositionedClientLaneMeasure {
  id: string;
  measureKey: string;
  kind: "manual" | "stock" | "process";
  centerX: number;
  stageId?: string;
}

export const clientProcessStages: ClientProcessStage[] = [
  { id: "lct", label: "LCT", layoutNodeId: "node-cut" },
  { id: "rf2", label: "Roll Former 2", layoutNodeId: "node-rf2" },
  { id: "rf3", label: "Roll Former 3", layoutNodeId: "node-stamp" },
  { id: "mesa-3", label: "Mesa 3", layoutNodeId: "node-weld-1" },
  { id: "beatty-3", label: "B3", layoutNodeId: "node-beatty-3" },
  { id: "beatty-4", label: "B4", layoutNodeId: "node-beatty-4" },
  { id: "beatty-2", label: "B2", layoutNodeId: "node-beatty-2" },
  { id: "beatty-1", label: "B1", layoutNodeId: "node-weld-2" },
  { id: "pa", label: "P.A", layoutNodeId: "node-weld-3" },
  { id: "cnc", label: "CNC Plasma", layoutNodeId: "node-cnc" },
  { id: "paint", label: "Pintura", layoutNodeId: "node-assembly" },
  { id: "rework", label: "Rebitagem", layoutNodeId: "node-rework" },
  { id: "stenhoj", label: "Stenhoj", layoutNodeId: "node-inspection" },
  { id: "packaging", label: "Embalagem", layoutNodeId: "node-packaging" },
];

const beattyMeasureByStage: Record<string, string> = {
  "beatty-1": "T-B1",
  "beatty-2": "T-B2",
  "beatty-3": "T-B3",
  "beatty-4": "T-B4",
};

/** Expande o vínculo agregado do PBIP para a Beatty física de cada cliente. */
export function mappingForClientStage(
  lane: ClientProcessLane,
  stage: Pick<ClientProcessStage, "id">,
): ClientStageMapping | undefined {
  const direct = lane.mappings.find((mapping) => mapping.stageId === stage.id);
  if (direct) return direct;

  const expectedMeasure = beattyMeasureByStage[stage.id];
  if (!expectedMeasure) return undefined;
  const aggregate = lane.mappings.find((mapping) => mapping.stageId === "beattys");
  if (!aggregate) return undefined;
  const participates = aggregate.participates && aggregate.processMeasureKeys.includes(expectedMeasure);
  return {
    ...aggregate,
    stageId: stage.id,
    participates,
    processMeasureKeys: participates ? [expectedMeasure] : [],
    stockMeasureKeys: participates ? aggregate.stockMeasureKeys : [],
  };
}

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
      mapped("lct", ["T-LCT/RF2"], ["E-D-P-LCT"], "PBIP: Volvo FH — tempo agregado LCT/RF2 e estoque LCT"),
      mapped("rf2", [], ["E-D-P-RF2"], "PBIP: estoque RF2 separado; o tempo agregado permanece uma única parcela da rota FH"),
      mapped("rf3", ["T-RF3"], ["E-P-D-FH-RF3"], "PBIP: Roll Former 3 filtrado para FH"),
      mapped("mesa-3", ["T-M3"], ["E-P-D-FH-M3"], "PBIP: Mesa 3 no contexto FH"),
      mapped("beattys", ["T-B4"], ["D-E-FH-B"], "PBIP: Beatty 4 e estoque FH Beattys"),
      mapped("pa", ["T-P.A"], ["D-E-FH-P.A"], "PBIP: P.A FH"),
      mapped("cnc", [], ["D-E-FH-CL"], "PBIP: Cantilever FH; CNC não é etapa de processo do total FH"),
      mapped("paint", ["T-LPP2"], ["D-E-FH-P.I"], "PBIP: Pintura e estoque de entrada FH"),
      mapped("rework", [], [], "Rebitagem não compõe a rota FH no catálogo PBIP", "validated"),
      mapped("stenhoj", ["T-STJ"], ["E-P-D-FH-STJ"], "PBIP: Stenhoj FH"),
      mapped("packaging", [], ["E-P-D-FH-EMB"], "PBIP: estoque de embalagem FH; sem tempo adicional no total"),
    ],
  },
  {
    key: "VM",
    label: "Volvo VM",
    totalMeasureKey: "T-T-VM",
    mappings: [
      mapped("lct", [], [], "Sem medida de processo VM para LCT no catálogo PBIP", "validated"),
      mapped("rf2", [], [], "Sem medida de processo VM para RF2 no catálogo PBIP", "validated"),
      mapped("rf3", ["T-RF3"], ["E-P-D-VM-RF3"], "PBIP: Roll Former 3 filtrado para VM"),
      {
        ...mapped("mesa-3", ["T-M3"], [], "T-M3 aparece como cartão, mas não compõe T-T-VM; confirmação operacional pendente", "pending"),
        participates: false,
      },
      mapped("beattys", ["T-B1"], ["D-E-VM-B"], "PBIP: Beatty 1 e estoque VM Beattys"),
      mapped("pa", [], [], "P.A não compõe a rota VM no catálogo PBIP", "validated"),
      mapped("cnc", ["T-CNC"], ["D-E-VM-CL"], "PBIP: CNC e Cantilever VM"),
      mapped("paint", ["T-LPP2"], ["D-E-VM-P.I"], "PBIP: Pintura e estoque de entrada VM"),
      mapped("rework", [], [], "Rebitagem não compõe a rota VM", "validated"),
      mapped("stenhoj", [], [], "VM segue para embalagem, não para Stenhoj", "validated"),
      mapped("packaging", ["T-EMB-VM"], ["E-P-D-VM-EMB"], "PBIP: tempo e estoque de embalagem VM"),
    ],
  },
  {
    key: "SCA",
    label: "Scania",
    totalMeasureKey: "T-T-SCA",
    mappings: [
      mapped("lct", [], [], "Sem medida de processo Scania para LCT no catálogo PBIP", "validated"),
      mapped("rf2", [], [], "Sem medida de processo Scania para RF2 no catálogo PBIP", "validated"),
      mapped("rf3", ["T-RF3"], ["E-P-D-SCA-RF3"], "PBIP: Roll Former 3 filtrado para Scania"),
      mapped("mesa-3", ["T-M3"], ["E-P-D-SCA-M3"], "PBIP: Mesa 3 no contexto Scania"),
      mapped("beattys", ["T-B3"], ["D-E-SCA-B"], "PBIP: Beatty 3 e estoque Scania Beattys"),
      mapped("pa", ["T-P.A"], ["D-E-SCA-P.A"], "PBIP: P.A Scania"),
      mapped("cnc", [], ["D-E-SCA-CL"], "PBIP: Cantilever Scania; CNC não participa da rota"),
      mapped("paint", ["T-LPP2"], ["D-E-SCA-P.I"], "PBIP: pintura Scania"),
      mapped("rework", ["T-SCA-REB"], ["D-E-SCA-REB"], "PBIP: rebitagem Scania"),
      mapped("stenhoj", ["T-STJ"], ["E-P-D-SCA-STJ"], "PBIP: Stenhoj Scania"),
      mapped("packaging", [], ["E-P-D-SCA-EMB"], "PBIP: estoque de embalagem Scania"),
    ],
  },
  {
    key: "DAF",
    label: "DAF",
    totalMeasureKey: "T-T-DAF",
    mappings: [
      mapped("lct", [], [], "Sem medida de processo DAF para LCT no catálogo PBIP", "validated"),
      mapped("rf2", [], [], "Sem medida de processo DAF para RF2 no catálogo PBIP", "validated"),
      mapped("rf3", ["T-RF3"], ["E-P-D-DAF-RF3"], "PBIP: Roll Former 3 filtrado para DAF"),
      mapped("mesa-3", ["T-M3"], ["E-P-D-DAF-M3"], "PBIP: Mesa 3 no contexto DAF"),
      mapped("beattys", ["T-B2"], ["D-E-DAF-B"], "PBIP: Beatty 2 e estoque DAF Beattys"),
      mapped("pa", [], [], "P.A não compõe a rota DAF no catálogo PBIP", "validated"),
      mapped("cnc", ["T-CNC"], ["D-E-DAF-CL"], "PBIP: CNC e Cantilever DAF"),
      mapped("paint", ["T-LPP2"], ["D-E-DAF-P.I"], "PBIP: pintura DAF"),
      mapped("rework", ["T-DAF-REB"], ["D-E-DAF-REB"], "PBIP: rebitagem DAF"),
      mapped("stenhoj", ["T-STJ"], ["E-P-D-DAF-STJ"], "PBIP: Stenhoj DAF"),
      mapped("packaging", [], ["E-P-D-DAF-EMB"], "PBIP: estoque de embalagem DAF"),
    ],
  },
];

export function positionClientStages(nodes: LayoutNode[]): PositionedClientStage[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return clientProcessStages.map((stage, index) => {
    const node = nodeMap.get(stage.layoutNodeId)
      ?? nodes.find((item) => item.id.endsWith(`-${stage.layoutNodeId}`))
      ?? nodes.find((item) => item.label === stage.label);
    const relatedNodes = (stage.relatedLayoutNodeIds ?? [stage.layoutNodeId])
      .map((id) => nodeMap.get(id) ?? nodes.find((item) => item.id.endsWith(`-${id}`)))
      .filter((item): item is LayoutNode => Boolean(item));
    const left = relatedNodes.length ? Math.min(...relatedNodes.map((item) => item.x)) : node?.x;
    const right = relatedNodes.length ? Math.max(...relatedNodes.map((item) => item.x + item.width)) : node ? node.x + node.width : undefined;
    return {
      ...stage,
      layoutNodeId: node?.id ?? stage.layoutNodeId,
      centerX: left !== undefined && right !== undefined ? (left + right) / 2 : 330 + index * 152,
      width: left !== undefined && right !== undefined ? right - left : 108,
    };
  });
}

function layoutNodeCenter(nodes: LayoutNode[], id: string, fallback: number): number {
  const node = nodes.find((item) => item.id === id || item.id.endsWith(`-${id}`));
  return node ? node.x + node.width / 2 : fallback;
}

function spreadMeasureKeys(
  measureKeys: string[],
  kind: PositionedClientLaneMeasure["kind"],
  left: number,
  right: number,
  stageId?: string,
): PositionedClientLaneMeasure[] {
  if (!measureKeys.length) return [];
  const width = Math.max(0, right - left);
  return measureKeys.map((measureKey, index) => ({
    id: `${kind}-${stageId ?? "intro"}-${measureKey}`,
    measureKey,
    kind,
    centerX: left + width * ((index + 1) / (measureKeys.length + 1)),
    stageId,
  }));
}

/** Posiciona cada cartão numérico na mesma sequência conceitual da faixa Layout do PBIP. */
export function positionClientLaneMeasures(
  lane: ClientProcessLane,
  stages: PositionedClientStage[],
  nodes: LayoutNode[],
): PositionedClientLaneMeasure[] {
  const firstStageCenter = stages[0]?.centerX ?? 650;
  const beneficiatorCenter = layoutNodeCenter(nodes, "node-beneficiator", firstStageCenter - 430);
  const rawCenter = layoutNodeCenter(nodes, "node-raw", firstStageCenter - 230);
  const finishedCenter = layoutNodeCenter(nodes, "node-finished", (stages.at(-1)?.centerX ?? firstStageCenter) + 260);
  const result: PositionedClientLaneMeasure[] = [
    { id: `manual-intro-T-B`, measureKey: "T-B", kind: "manual", centerX: beneficiatorCenter },
    { id: `manual-intro-T-T`, measureKey: "T-T", kind: "manual", centerX: (beneficiatorCenter + rawCenter) / 2 },
    { id: `stock-intro-Q-D-${lane.key}`, measureKey: `Q-D-${lane.key}`, kind: "stock", centerX: rawCenter },
  ];

  for (const [index, stage] of stages.entries()) {
    const mapping = mappingForClientStage(lane, stage);
    if (!mapping) continue;
    const pulseHalfWidth = Math.min(32, Math.max(18, stage.width * .28));
    if (mapping.participates) result.push(...spreadMeasureKeys(mapping.processMeasureKeys, "process", stage.centerX - pulseHalfWidth, stage.centerX + pulseHalfWidth, stage.id));

    const nextStage = stages[index + 1];
    const stockLeft = stage.centerX + pulseHalfWidth + 18;
    const stockRight = (nextStage?.centerX ?? finishedCenter) - (nextStage ? Math.min(32, Math.max(18, nextStage.width * .28)) : 18);
    result.push(...spreadMeasureKeys(mapping.stockMeasureKeys, "stock", stockLeft, Math.max(stockLeft, stockRight), stage.id));
  }
  return result;
}

export function buildClientProcessPath(
  lane: ClientProcessLane,
  stages: PositionedClientStage[],
  baseline = 23,
  raised = 7,
  startX?: number,
  endX?: number,
): string {
  if (!stages.length) return "";
  const start = startX ?? Math.max(0, stages[0].centerX - stages[0].width / 2);
  let path = `M ${start} ${baseline}`;
  for (const stage of stages) {
    const halfPulse = Math.min(32, Math.max(18, stage.width * 0.28));
    const before = stage.centerX - halfPulse;
    const after = stage.centerX + halfPulse;
    path += ` L ${before} ${baseline}`;
    if (mappingForClientStage(lane, stage)?.participates) {
      path += ` L ${before} ${raised} L ${after} ${raised} L ${after} ${baseline}`;
    } else {
      path += ` L ${after} ${baseline}`;
    }
  }
  const last = stages.at(-1)!;
  return `${path} L ${endX ?? last.centerX + last.width / 2} ${baseline}`;
}
