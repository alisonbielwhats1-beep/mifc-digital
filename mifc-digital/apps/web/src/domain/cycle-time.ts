export type CycleTimeMode = "manual" | "automatic";

export type CycleTimeStatus = "ready" | "waiting_source" | "not_available";

export interface AutomaticCycleTimeInput {
  availableMinutes?: number;
  productionCount?: number;
}

/**
 * Observed CT used by the Layout when the operational source is available.
 * The denominator is deliberately called a technical unit: the current
 * Oracle/MES bridge counts RAIL_ID, and its equivalence to physical pieces
 * still needs business approval.
 */
export function calculateAutomaticCycleTimeSeconds(input: AutomaticCycleTimeInput): number | undefined {
  if (!Number.isFinite(input.availableMinutes) || !Number.isFinite(input.productionCount)) return undefined;
  if (Number(input.availableMinutes) <= 0 || Number(input.productionCount) <= 0) return undefined;
  return (Number(input.availableMinutes) / Number(input.productionCount)) * 60;
}

export function automaticCycleTimeStatus(input: AutomaticCycleTimeInput & { sourceConfigured: boolean }): CycleTimeStatus {
  if (!input.sourceConfigured) return "not_available";
  return calculateAutomaticCycleTimeSeconds(input) === undefined ? "waiting_source" : "ready";
}

export function cycleTimeStatusLabel(status: CycleTimeStatus): string {
  if (status === "ready") return "Calculado pelo MES";
  if (status === "not_available") return "Fonte ainda não mapeada";
  return "Aguardando produção/paradas";
}
