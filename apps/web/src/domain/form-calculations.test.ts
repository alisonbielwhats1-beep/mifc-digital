import { describe, expect, it } from "vitest";
import {
  calculateMaterialStock,
  calculatePairsPerDay,
  calculateShiftAvailableMinutes,
  calculateWipDays,
} from "@mifc/calculation-engine";

describe("fórmulas confirmadas do MIPS", () => {
  it("calcula pares/dia como no Volume 2023", () => {
    expect(calculatePairsPerDay(85, 50)).toBe(127.5);
    expect(calculatePairsPerDay(30, 90)).toBe(57);
  });

  it("calcula os minutos líquidos do turno", () => {
    expect(calculateShiftAvailableMinutes({ startMinutes: 360, endMinutes: 936, rolloverMinutes: 0, mealMinutes: 60, meetingMinutes: 5 })).toBe(511);
    expect(calculateShiftAvailableMinutes({ startMinutes: 936, endMinutes: 1439, rolloverMinutes: 48, mealMinutes: 60, meetingMinutes: 0 })).toBe(491);
  });

  it("reproduz a cadeia de estoque do Volvo FH", () => {
    const result = calculateMaterialStock({
      averageLengthMm: 7150,
      widthMm: 449,
      thicknessMm: 8,
      densityKgDm3: 7.85,
      coilCount: 12,
      coilWeightKg: 7000,
      pairsPerDay: 127.5,
    });
    expect(result.weightPerPieceKg).toBeCloseTo(201.60998, 5);
    expect(result.stockDays).toBeCloseTo(1.633906, 5);
  });

  it("converte WIP em dias", () => {
    expect(calculateWipDays(68, 127.5)).toBeCloseTo(0.266666, 5);
  });
});
