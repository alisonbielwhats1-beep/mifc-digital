import type { AuditFields, CalculationRule, ValidationStatus } from "../../domain/src/index.js";
import { calculateLeadTimeDays, calculateMaterialStock, calculateMovementDays, calculatePairsPerDay, calculateProcessTimeDays, calculateShiftAvailableMinutes, calculateTransportDays, calculateWipDays } from "./formulas.js";
import { VersionedCalculationEngine, requireNumber, requireNumberArray, type CalculationContext, type ExecutableCalculationRule } from "./engine.js";

const audit: AuditFields = { createdAt: "2026-08-19T00:00:00-03:00", createdBy: "prompt-4", updatedAt: "2026-08-19T00:00:00-03:00", updatedBy: "prompt-4" };

type RuleSeed = Omit<CalculationRule, keyof AuditFields | "id" | "status"> & { evaluate?: (context: CalculationContext) => number | string };

function rule(seed: RuleSeed): ExecutableCalculationRule {
  return { ...audit, ...seed, id: `rule:${seed.code}:v${seed.version}`, status: "active" };
}

function material(context: CalculationContext, code: string) {
  return calculateMaterialStock({
    averageLengthMm: requireNumber(context, code, "averageLengthMm"),
    widthMm: requireNumber(context, code, "widthMm"),
    thicknessMm: requireNumber(context, code, "thicknessMm"),
    densityKgDm3: requireNumber(context, code, "densityKgDm3"),
    coilCount: requireNumber(context, code, "coilCount"),
    coilWeightKg: requireNumber(context, code, "coilWeightKg"),
    pairsPerDay: requireNumber(context, code, "pairsPerDay"),
  });
}

const materialInputs = ["averageLengthMm", "widthMm", "thicknessMm", "densityKgDm3", "coilCount", "coilWeightKg", "pairsPerDay"];

export const calculationRuleCatalog: readonly ExecutableCalculationRule[] = [
  rule({ code: "volume.pairs_per_day", name: "Pares por dia", version: 1, category: "Volume", unit: "pares/dia", inputKeys: ["vehiclesPerDay", "reinforcementPercent"], dependencyRuleIds: [], sourceReference: "Volume 2023!F8:F11", expression: "vehiclesPerDay × (1 + reinforcementPercent / 100)", validationStatus: "validated", evaluate: (ctx) => calculatePairsPerDay(requireNumber(ctx, "volume.pairs_per_day", "vehiclesPerDay"), requireNumber(ctx, "volume.pairs_per_day", "reinforcementPercent")) }),
  rule({ code: "calendar.shift_available_minutes", name: "Tempo disponível do turno", version: 1, category: "Calendário", unit: "minutos", inputKeys: ["startMinutes", "endMinutes", "rolloverMinutes", "mealMinutes", "meetingMinutes"], dependencyRuleIds: [], sourceReference: "Volume 2023!I3:I4", expression: "end - start + rollover - meal - meeting", validationStatus: "validated", evaluate: (ctx) => calculateShiftAvailableMinutes({ startMinutes: requireNumber(ctx, "calendar.shift_available_minutes", "startMinutes"), endMinutes: requireNumber(ctx, "calendar.shift_available_minutes", "endMinutes"), rolloverMinutes: requireNumber(ctx, "calendar.shift_available_minutes", "rolloverMinutes"), mealMinutes: requireNumber(ctx, "calendar.shift_available_minutes", "mealMinutes"), meetingMinutes: requireNumber(ctx, "calendar.shift_available_minutes", "meetingMinutes") }) }),
  rule({ code: "material.weight_per_piece_kg", name: "Peso médio por peça", version: 1, category: "Material", unit: "kg/peça", inputKeys: materialInputs, dependencyRuleIds: [], sourceReference: "Volume 2023!G8:G11", expression: "length × width × thickness × density / 1,000,000", validationStatus: "validated", evaluate: (ctx) => material(ctx, "material.weight_per_piece_kg").weightPerPieceKg }),
  rule({ code: "material.stock_weight_kg", name: "Peso de bobinas", version: 1, category: "Material", unit: "kg", inputKeys: materialInputs, dependencyRuleIds: [], sourceReference: "Volume 2023!J8:J11", expression: "coilCount × coilWeightKg", validationStatus: "validated", evaluate: (ctx) => material(ctx, "material.stock_weight_kg").stockWeightKg }),
  rule({ code: "material.stock_pieces", name: "Estoque Slitter em peças", version: 1, category: "Estoque", unit: "peças", inputKeys: materialInputs, dependencyRuleIds: [], sourceReference: "Volume 2023!K8:K11", expression: "stockWeightKg / weightPerPieceKg", validationStatus: "validated", evaluate: (ctx) => material(ctx, "material.stock_pieces").stockPieces }),
  rule({ code: "material.stock_pairs", name: "Estoque Slitter em pares", version: 1, category: "Estoque", unit: "pares", inputKeys: materialInputs, dependencyRuleIds: [], sourceReference: "Volume 2023!L8:L11", expression: "stockPieces / 2", validationStatus: "validated", evaluate: (ctx) => material(ctx, "material.stock_pairs").stockPairs }),
  rule({ code: "material.stock_days", name: "Dias de estoque Slitter", version: 1, category: "Estoque", unit: "dias", inputKeys: materialInputs, dependencyRuleIds: [], sourceReference: "Volume 2023!M8:M11", expression: "stockPairs / pairsPerDay", validationStatus: "validated", evaluate: (ctx) => material(ctx, "material.stock_days").stockDays }),
  rule({ code: "wip.days", name: "WIP em dias", version: 1, category: "WIP", unit: "dias", inputKeys: ["quantityPieces", "pairsPerDay"], dependencyRuleIds: [], sourceReference: "MIFC-2023 linhas 24, 27, 30 e 33; PBIP família D-E-*", expression: "quantityPieces / 2 / pairsPerDay", validationStatus: "validated", evaluate: (ctx) => calculateWipDays(requireNumber(ctx, "wip.days", "quantityPieces"), requireNumber(ctx, "wip.days", "pairsPerDay")) }),
  rule({ code: "logistics.movement_days", name: "Tempo de movimentação", version: 1, category: "Logística", unit: "dias", inputKeys: ["movementMinutes"], dependencyRuleIds: [], sourceReference: "MIFC-2023; PBIP [T-M]", expression: "movementMinutes / 1440", validationStatus: "validated", evaluate: (ctx) => calculateMovementDays(requireNumber(ctx, "logistics.movement_days", "movementMinutes")) }),
  rule({ code: "logistics.transport_days", name: "Tempo de transporte", version: 1, category: "Logística", unit: "dias", inputKeys: ["transportHours"], dependencyRuleIds: [], sourceReference: "MIFC-2023; PBIP [T-T]", expression: "transportHours / 24", validationStatus: "validated", evaluate: (ctx) => calculateTransportDays(requireNumber(ctx, "logistics.transport_days", "transportHours")) }),
  rule({ code: "process.time_days", name: "Tempo de processo", version: 1, category: "Processo", unit: "dias", inputKeys: ["availableMinutes", "demandPieces"], dependencyRuleIds: [], sourceReference: "MIFC-2023 linhas de processo; PBIP família T-*", expression: "availableMinutes / demandPieces / 1440", validationStatus: "validated", evaluate: (ctx) => calculateProcessTimeDays(requireNumber(ctx, "process.time_days", "availableMinutes"), requireNumber(ctx, "process.time_days", "demandPieces")) }),
  rule({ code: "lead_time.total_days", name: "Lead Time total", version: 1, category: "Lead Time", unit: "dias", inputKeys: ["componentDays"], dependencyRuleIds: [], sourceReference: "MIFC-2023!CV23:CV34; PBIP T-T-FH/VM/SCA/DAF", expression: "sum(componentDays)", validationStatus: "validated", evaluate: (ctx) => calculateLeadTimeDays(requireNumberArray(ctx, "lead_time.total_days", "componentDays")) }),
  pendingRule("calendar.working_days", "Dias trabalhados", "Calendário", "dias", ["calendarDates"], "Calendar[Dia_Min]; definição anual do cenário pendente"),
  pendingRule("volume.annual_pairs", "Volume anual", "Volume", "pares/ano", ["pairsPerDay", "workingDays"], "Regra visual consistente, mas sem célula autossuficiente no MIPS"),
  pendingRule("capacity.per_day", "Capacidade por dia", "Capacidade", "peças/dia", ["nominalCapacityPerHour", "availableHours", "efficiencyPercent"], "dOperacao[Capacidade], Máquinas e medidas T-P-M-*"),
  pendingRule("capacity.utilization_percent", "Utilização", "Capacidade", "%", ["demandPieces", "capacityPerDay"], "PBIP/Layout; definição por processo pendente"),
  pendingRule("capacity.bottleneck", "Gargalo", "Capacidade", "processo", ["processUtilizations"], "PBIP/Layout; critério de desempate pendente"),
];

function pendingRule(code: string, name: string, category: string, unit: string, inputKeys: string[], sourceReference: string, validationStatus: ValidationStatus = "mapped"): ExecutableCalculationRule {
  return rule({ code, name, version: 1, category, unit, inputKeys, dependencyRuleIds: [], sourceReference, expression: "Pendente de validação de paridade", validationStatus });
}

export function createMifcCalculationEngine(): VersionedCalculationEngine {
  const engine = new VersionedCalculationEngine();
  for (const calculationRule of calculationRuleCatalog) engine.register(calculationRule);
  return engine;
}
