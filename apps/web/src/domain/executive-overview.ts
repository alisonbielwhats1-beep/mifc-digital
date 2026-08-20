import type { ClientTotalResult } from "@/domain/layout-value-lineage";

interface ExecutiveBuffer {
  quantityPieces: number;
  status: "active" | "inactive";
  origin: "INPUT" | "ORACLE_MES";
}

interface CapacityCandidate {
  label: string;
  capacityPerDay?: number | null;
  demandPerDay?: number;
}

export interface ExecutiveOverviewInput {
  clientTotals: ClientTotalResult[];
  buffers: ExecutiveBuffer[];
  measureValues: Record<string, number> | null;
  productionReady: boolean;
  capacityCandidates: CapacityCandidate[];
  connected: boolean;
  lastUpdatedAt: string | null;
  overdueActions: number;
}

interface NumericExecutiveMetric {
  value?: number;
  clientKey?: ClientTotalResult["clientKey"];
}

const productionKeys = ["P-RF3", "P-B1", "P-B2", "P-B3", "P-B4", "P-P.A", "P-CNC", "P-LPP2", "P-STJ"];
const demandKeys = ["D-P-RF3", "D-P-B1", "D-P-B2", "D-P-B3", "D-P-B4", "D-P-P.A", "D-P-CNC", "D-P-LPP2", "D-P-STJ"];

function sumPresent(values: Record<string, number> | null, keys: string[]): number | undefined {
  if (!values) return undefined;
  const present = keys.map((key) => values[key]).filter((value): value is number => Number.isFinite(value));
  return present.length ? present.reduce((total, value) => total + value, 0) : undefined;
}

export function summarizeExecutiveOverview(input: ExecutiveOverviewInput) {
  const completeTotals = input.clientTotals.filter((total) => Number.isFinite(total.value));
  const leadTimeSource = completeTotals.sort((left, right) => Number(right.value) - Number(left.value))[0];
  const leadTime: NumericExecutiveMetric = leadTimeSource
    ? { value: leadTimeSource.value, clientKey: leadTimeSource.clientKey }
    : {};
  const valueAddedValue = leadTimeSource?.inputs
    .filter((entry) => entry.origin === "PROCESS" && Number.isFinite(entry.value))
    .reduce((total, entry) => total + Number(entry.value) * entry.multiplier, 0);
  const valueAdded: NumericExecutiveMetric = valueAddedValue === undefined
    ? {}
    : { value: valueAddedValue, clientKey: leadTimeSource?.clientKey };
  const nonValueAdded: NumericExecutiveMetric = leadTimeSource?.value === undefined || valueAddedValue === undefined
    ? {}
    : { value: Math.max(0, leadTimeSource.value - valueAddedValue), clientKey: leadTimeSource.clientKey };

  const activeBuffers = input.buffers.filter((buffer) => buffer.status === "active");
  const wip = activeBuffers.length && activeBuffers.every((buffer) => Number.isFinite(buffer.quantityPieces) && buffer.quantityPieces >= 0)
    ? { value: activeBuffers.reduce((total, buffer) => total + buffer.quantityPieces, 0) }
    : {};

  const production = input.productionReady ? { value: sumPresent(input.measureValues, productionKeys) } : {};
  const demand = input.productionReady ? { value: sumPresent(input.measureValues, demandKeys) } : {};
  const bottleneck = input.capacityCandidates
    .filter((candidate) => Number(candidate.capacityPerDay) > 0 && Number.isFinite(candidate.demandPerDay))
    .map((candidate) => ({
      label: candidate.label,
      utilizationPercent: Number(candidate.demandPerDay) / Number(candidate.capacityPerDay) * 100,
    }))
    .sort((left, right) => right.utilizationPercent - left.utilizationPercent)[0] ?? {};

  return {
    leadTime,
    valueAdded,
    nonValueAdded,
    wip,
    production,
    demand,
    bottleneck,
    overdueActions: input.overdueActions,
    connection: {
      state: input.connected ? "connected" as const : "offline" as const,
      lastUpdatedAt: input.lastUpdatedAt,
    },
  };
}
