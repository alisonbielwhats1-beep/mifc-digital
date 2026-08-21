export interface ShiftScheduleInput {
  startMinutes: number;
  endMinutes: number;
  rolloverMinutes: number;
  mealMinutes: number;
  meetingMinutes: number;
}

export interface MaterialStockInput {
  averageLengthMm: number;
  widthMm: number;
  thicknessMm: number;
  densityKgDm3: number;
  coilCount: number;
  coilWeightKg: number;
  pairsPerDay: number;
}

export interface MaterialStockResult {
  weightPerPieceKg: number;
  stockWeightKg: number;
  stockPieces: number;
  stockPairs: number;
  stockDays: number;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Fórmula validada em Volume 2023!F8:F11. */
export function calculatePairsPerDay(vehiclesPerDay: number, reinforcementPercent: number): number {
  return finiteOrZero(vehiclesPerDay) * (1 + finiteOrZero(reinforcementPercent) / 100);
}

/** Fórmulas validadas em Volume 2023!I3:I4. */
export function calculateShiftAvailableMinutes(input: ShiftScheduleInput): number {
  return Math.max(0, finiteOrZero(input.endMinutes) - finiteOrZero(input.startMinutes) + finiteOrZero(input.rolloverMinutes) - finiteOrZero(input.mealMinutes) - finiteOrZero(input.meetingMinutes));
}

/** Cadeia validada em Volume 2023!G8:M11. */
export function calculateMaterialStock(input: MaterialStockInput): MaterialStockResult {
  const weightPerPieceKg = finiteOrZero(input.averageLengthMm) * finiteOrZero(input.widthMm) * finiteOrZero(input.thicknessMm) * finiteOrZero(input.densityKgDm3) / 1_000_000;
  const stockWeightKg = finiteOrZero(input.coilCount) * finiteOrZero(input.coilWeightKg);
  const stockPieces = weightPerPieceKg > 0 ? stockWeightKg / weightPerPieceKg : 0;
  const stockPairs = stockPieces / 2;
  const stockDays = input.pairsPerDay > 0 ? stockPairs / input.pairsPerDay : 0;
  return { weightPerPieceKg, stockWeightKg, stockPieces, stockPairs, stockDays };
}

/** Conversão de WIP em peças para dias, conforme linhas de espera do MIFC-2023. */
export function calculateWipDays(quantityPieces: number, pairsPerDay: number): number {
  return pairsPerDay > 0 ? finiteOrZero(quantityPieces) / 2 / pairsPerDay : 0;
}

/** Conversão confirmada em MIFC-2023 e na medida T-M. */
export function calculateMovementDays(minutes: number): number {
  return finiteOrZero(minutes) / 1_440;
}

/** Conversão confirmada em MIFC-2023 e na medida T-T. */
export function calculateTransportDays(hours: number): number {
  return finiteOrZero(hours) / 24;
}

/** Família T-* do PBIP e linhas de processo do MIFC-2023. */
export function calculateProcessTimeDays(availableMinutes: number, demandPieces: number): number {
  return demandPieces > 0 ? finiteOrZero(availableMinutes) / demandPieces / 1_440 : 0;
}

export function calculateLeadTimeDays(componentDays: readonly number[]): number {
  return componentDays.reduce((total, value) => total + finiteOrZero(value), 0);
}
