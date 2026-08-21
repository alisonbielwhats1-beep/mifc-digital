import type { MifcFlowType } from "@mifc/domain";

export interface Point { x: number; y: number }
export interface GraphNodeBox extends Point { id: string; width: number; height: number }
export interface GraphEdgeLike { sourceNodeId: string; targetNodeId: string; flowType: MifcFlowType }
export interface EdgeGeometry { start: Point; end: Point; control: Point; midpoint: Point; horizontal: boolean; path: string }

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function edgeGeometry(source: GraphNodeBox, target: GraphNodeBox, curveOffset = 0): EdgeGeometry {
  const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const horizontal = Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y);
  const start = horizontal
    ? { x: targetCenter.x >= sourceCenter.x ? source.x + source.width : source.x, y: sourceCenter.y }
    : { x: sourceCenter.x, y: targetCenter.y >= sourceCenter.y ? source.y + source.height : source.y };
  const end = horizontal
    ? { x: targetCenter.x >= sourceCenter.x ? target.x : target.x + target.width, y: targetCenter.y }
    : { x: targetCenter.x, y: targetCenter.y >= sourceCenter.y ? target.y : target.y + target.height };
  const control = horizontal
    ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 + curveOffset }
    : { x: (start.x + end.x) / 2 + curveOffset, y: (start.y + end.y) / 2 };
  const midpoint = { x: (start.x + 2 * control.x + end.x) / 4, y: (start.y + 2 * control.y + end.y) / 4 };
  return { start, end, control, midpoint, horizontal, path: `M ${start.x} ${start.y} Q ${control.x} ${control.y}, ${end.x} ${end.y}` };
}

export function edgePath(source: GraphNodeBox, target: GraphNodeBox, curveOffset = 0): string { return edgeGeometry(source,target,curveOffset).path; }

export function canConnect(edges: GraphEdgeLike[], sourceNodeId: string, targetNodeId: string, flowType: MifcFlowType): boolean {
  if (!sourceNodeId || sourceNodeId === targetNodeId) return false;
  return !edges.some((edge) => edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId && edge.flowType === flowType);
}
