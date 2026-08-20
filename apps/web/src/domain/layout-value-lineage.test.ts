import { describe, expect, it } from "vitest";
import { calculateClientTotal } from "@/domain/layout-value-lineage";

describe("rastreabilidade do tempo total do cliente", () => {
  it("reproduz exatamente os componentes da medida T-T-FH", () => {
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
    });

    expect(result.measureKey).toBe("T-T-FH");
    expect(result.missingKeys).toEqual([]);
    expect(result.value).toBeCloseTo(4 / 24 + (5 / 1440) * 7 + 66);
    expect(result.inputs.find((input) => input.key === "T-M")?.multiplier).toBe(7);
  });

  it("não soma parcialmente nem transforma medida ausente em zero", () => {
    const result = calculateClientTotal("VM", {
      "Q-D-VM": 1,
      "E-P-D-VM-RF3": 2,
      "D-E-VM-B": 3,
      "D-E-VM-CL": 4,
      "D-E-VM-P.I": 5,
    });

    expect(result.value).toBeUndefined();
    expect(result.missingKeys).toEqual(["E-P-D-VM-EMB"]);
  });
});
