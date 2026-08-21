import { describe, expect, it } from "vitest";
import { calculateClientTotal } from "@/domain/layout-value-lineage";

describe("rastreabilidade do tempo total do cliente", () => {
  it("soma parâmetros manuais, estoques e cada máquina da rota FH uma única vez", () => {
    const result = calculateClientTotal("FH", {
      "E-D-P-LCT": 1,
      "Q-D-FH": 2,
      "E-D-P-RF2": 3,
      "E-P-D-FH-RF3": 4,
      "E-P-D-FH-M3": 5,
      "D-E-FH-B": 6,
      "D-E-FH-CL": 7,
      "D-E-FH-P.I": 8,
      "D-E-FH-P.A": 9,
      "E-P-D-FH-STJ": 10,
      "E-P-D-FH-EMB": 11,
    }, {
      transportHours: 6,
      beneficiatorDays: 1.25,
      movementMinutes: 10,
      processValues: {
        "T-LCT/RF2": 0.1,
        "T-RF3": 0.2,
        "T-M3": 0.3,
        "T-B4": 0.4,
        "T-P.A": 0.5,
        "T-LPP2": 0.6,
        "T-STJ": 0.7,
      },
    });

    expect(result.measureKey).toBe("LT-TOTAL-FH");
    expect(result.missingKeys).toEqual([]);
    expect(result.value).toBeCloseTo(6 / 24 + 1.25 + (10 / 1440) * 7 + 66 + 2.8);
    expect(result.inputs.find((input) => input.key === "T-M")?.multiplier).toBe(7);
    expect(result.inputs.filter((input) => input.origin === "PROCESS")).toHaveLength(7);
  });

  it("não soma parcialmente nem transforma medida ausente em zero", () => {
    const result = calculateClientTotal("VM", {
      "Q-D-VM": 1,
      "E-P-D-VM-RF3": 2,
      "D-E-VM-B": 3,
      "D-E-VM-CL": 4,
      "D-E-VM-P.I": 5,
    }, {
      transportHours: 4,
      beneficiatorDays: 0,
      movementMinutes: 5,
      processValues: {
        "T-RF3": 0.1,
        "T-B1": 0.2,
        "T-CNC": 0.3,
        "T-LPP2": 0.4,
        "T-EMB-VM": 0.5,
      },
    });

    expect(result.value).toBeUndefined();
    expect(result.missingKeys).toEqual(["E-P-D-VM-EMB"]);
  });

  it("exige os inputs manuais e todos os tempos de máquina da rota", () => {
    const result = calculateClientTotal("VM", {
      "Q-D-VM": 1,
      "E-P-D-VM-RF3": 2,
      "D-E-VM-B": 3,
      "D-E-VM-CL": 4,
      "D-E-VM-P.I": 5,
      "E-P-D-VM-EMB": 6,
    }, {
      processValues: { "T-RF3": 0.1 },
    });

    expect(result.value).toBeUndefined();
    expect(result.missingKeys).toEqual(expect.arrayContaining([
      "INPUT:transportHours",
      "INPUT:beneficiatorDays",
      "INPUT:movementMinutes",
      "T-B1",
      "T-CNC",
      "T-LPP2",
      "T-EMB-VM",
    ]));
  });
});
