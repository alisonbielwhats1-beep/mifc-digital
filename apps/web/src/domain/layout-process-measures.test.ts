import { describe, expect, it } from "vitest";
import { calculateLayoutProcessMeasures } from "./layout-process-measures.js";

describe("tempos de processo do Layout", () => {
  it("combina demandas Oracle com minutos locais conforme o PBIP", () => {
    const values = calculateLayoutProcessMeasures({
      "D-P-RF3": 100,
      "D-P-B1": 50,
      "D-P-B3": 80,
      "D-P-B4": 40,
      "D-P-LPP2": 100,
      "D-P-STJ": 90,
      "D-P-SCA-REB": 80,
      "D-P-DAF-REB": 20,
    }, { rf3: 1_000, beatty: 960, paint: 960, stenhoj: 960 });

    expect(values).toEqual({
      "T-RF3": 1_000 / 100 / 1_440,
      "T-B1": 960 / 50 / 1_440,
      "T-B3": 960 / 80 / 1_440,
      "T-B4": 960 / 40 / 1_440,
      "T-LPP2": 960 / 100 / 1_440,
      "T-STJ": 960 / 90 / 1_440,
      "T-SCA-REB": 960 / 80 / 1_440,
      "T-DAF-REB": 960 / 20 / 1_440,
      "T-M3": 0,
    });
  });

  it("não publica medidas sem demanda válida", () => {
    expect(calculateLayoutProcessMeasures({ "D-P-RF3": 0 }, { rf3: 1_000, beatty: 0, paint: 0, stenhoj: 0 })).toEqual({ "T-M3": 0 });
  });
});
