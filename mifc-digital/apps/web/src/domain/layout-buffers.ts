import type { LayoutNode } from "@/stores/mifc-layout";

export interface LayoutBufferInput {
  id: string;
  customer: string;
  point: string;
  direction: "entrada" | "saída";
  type: "matéria-prima" | "processo" | "produto acabado" | "estagnação";
  quantityPieces: number | null;
  capacityPieces: number;
  pairsPerDay: number;
  inputProcess: string;
  outputProcess: string;
  origin: "INPUT" | "ORACLE_MES";
  sourceUpdatedAt?: string;
  status: "active" | "inactive";
}

export interface PositionedLayoutBuffer extends LayoutBufferInput {
  x: number;
  y: number;
  inputNodeId?: string;
  outputNodeId?: string;
  wipDays?: number;
}

const aliases: Array<[RegExp, string[]]> = [
  [/slitter|mat[eé]ria.?prima|almox/i, ["node-raw"]],
  [/rf2|rollformer 2|roll former 2/i, ["node-rf2"]],
  [/lct/i, ["node-cut"]],
  [/rf3|rollformer 3|roll former 3/i, ["node-stamp"]],
  [/mesa 3/i, ["node-weld-1"]],
  [/beatty 1/i, ["node-weld-2"]],
  [/beatty 2/i, ["node-beatty-2"]],
  [/beatty 3/i, ["node-beatty-3"]],
  [/beatty 4/i, ["node-beatty-4"]],
  [/p\.?a|cantilever/i, ["node-weld-3"]],
  [/cnc|plasma|grava[cç][aã]o/i, ["node-cnc"]],
  [/montagem|pintura/i, ["node-assembly"]],
  [/rebitagem/i, ["node-rework"]],
  [/stenhoj/i, ["node-inspection"]],
  [/embalagem|embalaje/i, ["node-packaging"]],
  [/produto acabado|estoque fg|expedi[cç][aã]o/i, ["node-finished", "node-shipping"]],
];

function nodeByReference(reference: string, nodes: LayoutNode[]): LayoutNode | undefined {
  const normalized = reference.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return undefined;
  const direct = nodes.find((node) => node.label.toLocaleLowerCase("pt-BR").includes(normalized)
    || normalized.includes(node.label.replace(/\n/g, " ").toLocaleLowerCase("pt-BR")));
  if (direct) return direct;
  const alias = aliases.find(([pattern]) => pattern.test(reference));
  return alias?.[1].map((id) => nodes.find((node) => node.id === id || node.id.endsWith(`-${id}`))).find(Boolean);
}

export function positionLayoutBuffers(
  buffers: LayoutBufferInput[],
  nodes: LayoutNode[],
): PositionedLayoutBuffer[] {
  const occupied: Array<{ x: number; y: number }> = [];
  return buffers.filter((buffer) => buffer.status === "active").map((buffer, index) => {
    const input = nodeByReference(buffer.inputProcess, nodes);
    const output = nodeByReference(buffer.outputProcess, nodes);
    const anchor = output ?? input;
    let x = anchor ? anchor.x - 54 : 280 + index * 108;
    let y = anchor ? Math.max(8, anchor.y - 96) : 330;
    if (input && output && input.id !== output.id) {
      x = (input.x + input.width + output.x) / 2 - 45;
      y = Math.max(8, Math.min(input.y, output.y) - 96);
    }
    x = Math.max(8, x);
    while (occupied.some((item) => x < item.x + 108 && x + 108 > item.x && y < item.y + 84 && y + 84 > item.y)) x += 108;
    occupied.push({ x, y });
    const quantity = buffer.quantityPieces;
    const wipDays = quantity !== null && Number.isFinite(quantity) && buffer.pairsPerDay > 0
      ? quantity / 2 / buffer.pairsPerDay
      : undefined;
    return {
      ...buffer,
      x,
      y,
      inputNodeId: input?.id,
      outputNodeId: output?.id,
      wipDays,
    };
  });
}
