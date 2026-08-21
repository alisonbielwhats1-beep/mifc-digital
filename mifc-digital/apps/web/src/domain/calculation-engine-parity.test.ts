import { describe, expect, it } from "vitest";
import type { FieldValue } from "@mifc/domain";
import {
  RuleNotValidatedError,
  calculateLeadTimeDays,
  calculateMaterialStock,
  calculateMovementDays,
  calculatePairsPerDay,
  calculateProcessTimeDays,
  calculateShiftAvailableMinutes,
  calculateTransportDays,
  calculateWipDays,
  calculationRuleCatalog,
  createMifcCalculationEngine,
  excelParityReferences,
} from "@mifc/calculation-engine";

function field(value: unknown): FieldValue<unknown> {
  return { value, origin: "INPUT", sourceLabel: "teste de paridade", editable: true, fallback: false, validationStatus: "validated" };
}

function context(values: Record<string, unknown>) {
  return {
    revisionId: "revision-parity",
    now: "2026-08-19T12:00:00-03:00",
    fields: new Map(Object.entries(values).map(([key, value]) => [key, field(value)])),
    previousResults: new Map(),
    subject: { type: "fixture", id: "excel" },
  };
}

describe("paridade com o MIPS 2026", () => {
  it("reproduz os quatro resultados de pares/dia", () => {
    for (const fixture of excelParityReferences.pairsPerDay) expect(calculatePairsPerDay(fixture.vehiclesPerDay, fixture.reinforcementPercent)).toBeCloseTo(fixture.expected, 10);
  });

  it("reproduz os dois turnos", () => {
    for (const fixture of excelParityReferences.shifts) expect(calculateShiftAvailableMinutes(fixture)).toBeCloseTo(fixture.expected, 10);
  });

  it("reproduz peso e dias de Slitter para os quatro clientes", () => {
    for (const fixture of excelParityReferences.materialStock) {
      const result = calculateMaterialStock(fixture);
      expect(result.weightPerPieceKg).toBeCloseTo(fixture.expectedWeight, 6);
      expect(result.stockDays).toBeCloseTo(fixture.expectedDays, 10);
    }
  });

  it("reproduz amostras de WIP em dias", () => {
    for (const fixture of excelParityReferences.wipDays) expect(calculateWipDays(fixture.quantityPieces, fixture.pairsPerDay)).toBeCloseTo(fixture.expected, 12);
  });

  it("reproduz amostras de tempo de processo", () => {
    for (const fixture of excelParityReferences.processTime) expect(calculateProcessTimeDays(fixture.availableMinutes, fixture.demandPieces)).toBeCloseTo(fixture.expected, 12);
  });

  it("reproduz movimento, transporte e os totais por cliente", () => {
    expect(calculateMovementDays(5)).toBeCloseTo(5 / 1440, 12);
    expect(calculateTransportDays(4)).toBeCloseTo(4 / 24, 12);
    for (const fixture of excelParityReferences.totals) expect(calculateLeadTimeDays(fixture.componentDays)).toBeCloseTo(fixture.expected, 12);
  });
});

describe("execução e governança do Calculation Engine", () => {
  it("executa uma regra validada com resultado rastreável", () => {
    const engine = createMifcCalculationEngine();
    const result = engine.calculate("volume.pairs_per_day", context({ vehiclesPerDay: 85, reinforcementPercent: 50 }));
    expect(result.numericValue).toBe(127.5);
    expect(result.origin).toBe("CALCULATED");
    expect(result.calculationRuleId).toBe("rule:volume.pairs_per_day:v1");
  });

  it("bloqueia capacidade/dia enquanto a regra estiver pendente", () => {
    const engine = createMifcCalculationEngine();
    expect(() => engine.calculate("capacity.per_day", context({ nominalCapacityPerHour: 75, availableHours: 16, efficiencyPercent: 85 }))).toThrow(RuleNotValidatedError);
  });

  it("mantém um catálogo explícito de regras validadas e pendentes", () => {
    const validated = calculationRuleCatalog.filter((rule) => rule.validationStatus === "validated");
    const pending = calculationRuleCatalog.filter((rule) => rule.validationStatus !== "validated");
    expect(validated.length).toBe(12);
    expect(pending.map((rule) => rule.code)).toEqual(expect.arrayContaining(["capacity.per_day", "capacity.utilization_percent", "capacity.bottleneck"]));
  });
});
