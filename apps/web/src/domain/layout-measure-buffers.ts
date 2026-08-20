import type { LayoutClientKey } from "@/domain/client-process-matrix";
import type { LayoutNode } from "@/stores/mifc-layout";

export interface LayoutMeasureBufferValue {
  clientKey: LayoutClientKey;
  clientLabel: string;
  measureKey: string;
  value?: number;
}

export interface PositionedLayoutMeasureBuffer {
  id: string;
  label: string;
  anchorNodeId: string;
  x: number;
  y: number;
  values: LayoutMeasureBufferValue[];
}

interface MeasureBufferDefinition {
  id: string;
  label: string;
  anchorNodeId: string;
  offsetX?: number;
  offsetY?: number;
  measures: Array<[LayoutClientKey, string]>;
}

const clientLabels: Record<LayoutClientKey, string> = {
  FH: "FH",
  VM: "VM",
  SCA: "Scania",
  DAF: "DAF",
};

const definitions: MeasureBufferDefinition[] = [
  { id: "slitter", label: "Slitter", anchorNodeId: "node-raw", measures: [["FH", "Q-D-FH"], ["VM", "Q-D-VM"], ["SCA", "Q-D-SCA"], ["DAF", "Q-D-DAF"]] },
  { id: "lct", label: "Buffer LCT", anchorNodeId: "node-cut", offsetX: -64, measures: [["FH", "E-D-P-LCT"]] },
  { id: "rf2", label: "Buffer RF2", anchorNodeId: "node-cut", offsetX: 68, measures: [["FH", "E-D-P-RF2"]] },
  { id: "rf3", label: "Buffer RF3", anchorNodeId: "node-stamp", measures: [["FH", "E-P-D-FH-RF3"], ["VM", "E-P-D-VM-RF3"], ["SCA", "E-P-D-SCA-RF3"], ["DAF", "E-P-D-DAF-RF3"]] },
  { id: "mesa-3", label: "Buffer Mesa 3", anchorNodeId: "node-weld-1", measures: [["FH", "E-P-D-FH-M3"], ["SCA", "E-P-D-SCA-M3"], ["DAF", "E-P-D-DAF-M3"]] },
  { id: "beatty-4", label: "Buffer Beatty 4", anchorNodeId: "node-beatty-4", measures: [["FH", "D-E-FH-B"]] },
  { id: "beatty-1", label: "Buffer Beatty 1", anchorNodeId: "node-weld-2", measures: [["VM", "D-E-VM-B"]] },
  { id: "beatty-3", label: "Buffer Beatty 3", anchorNodeId: "node-beatty-3", measures: [["SCA", "D-E-SCA-B"]] },
  { id: "beatty-2", label: "Buffer Beatty 2", anchorNodeId: "node-beatty-2", measures: [["DAF", "D-E-DAF-B"]] },
  { id: "pa", label: "Buffer P.A", anchorNodeId: "node-weld-3", offsetX: -64, measures: [["FH", "D-E-FH-P.A"], ["SCA", "D-E-SCA-P.A"]] },
  { id: "cantilever", label: "Buffer Cantilever", anchorNodeId: "node-weld-3", offsetX: 68, measures: [["FH", "D-E-FH-CL"], ["VM", "D-E-VM-CL"], ["SCA", "D-E-SCA-CL"], ["DAF", "D-E-DAF-CL"]] },
  { id: "paint-input", label: "Buffer Pintura", anchorNodeId: "node-assembly", offsetX: -64, measures: [["FH", "D-E-FH-P.I"], ["VM", "D-E-VM-P.I"], ["SCA", "D-E-SCA-P.I"], ["DAF", "D-E-DAF-P.I"]] },
  { id: "rebitagem", label: "Buffer Rebitagem", anchorNodeId: "node-assembly", offsetX: 68, measures: [["SCA", "D-E-SCA-REB"], ["DAF", "D-E-DAF-REB"]] },
  { id: "stenhoj", label: "Buffer Stenhoj", anchorNodeId: "node-inspection", offsetX: -64, measures: [["FH", "E-P-D-FH-STJ"], ["SCA", "E-P-D-SCA-STJ"], ["DAF", "E-P-D-DAF-STJ"]] },
  { id: "embalagem", label: "Buffer Embalagem", anchorNodeId: "node-inspection", offsetX: 68, measures: [["FH", "E-P-D-FH-EMB"], ["VM", "E-P-D-VM-EMB"], ["SCA", "E-P-D-SCA-EMB"], ["DAF", "E-P-D-DAF-EMB"]] },
];

function nodeBySuffix(nodes: LayoutNode[], suffix: string): LayoutNode | undefined {
  return nodes.find((node) => node.id === suffix || node.id.endsWith(`-${suffix}`));
}

export function buildLayoutMeasureBuffers(
  nodes: LayoutNode[],
  measureValues: Record<string, number> | null,
): PositionedLayoutMeasureBuffer[] {
  const values = measureValues ?? {};
  return definitions.flatMap((definition) => {
    const anchor = nodeBySuffix(nodes, definition.anchorNodeId);
    if (!anchor) return [];
    return [{
      id: definition.id,
      label: definition.label,
      anchorNodeId: anchor.id,
      x: anchor.x + (definition.offsetX ?? 0),
      y: anchor.y + anchor.height + 8 + (definition.offsetY ?? 0),
      values: definition.measures.map(([clientKey, measureKey]) => ({
        clientKey,
        clientLabel: clientLabels[clientKey],
        measureKey,
        value: Number.isFinite(values[measureKey]) ? values[measureKey] : undefined,
      })),
    }];
  });
}
