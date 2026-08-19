import { describe, expect, it } from "vitest";
import { calculateLayoutProcessMeasures, formatProcessDays } from "./layout-process-measures.js";

describe("tempos de processo do Layout", () => {
  it("combina demandas Oracle com minutos locais conforme o PBIP", () => {
    const values = calculateLayoutProcessMeasures({
      "D-P-RF3": 100,
      "D-P-B1": 50,
      "D-P-B2": 20,
      "D-P-B3": 80,
      "D-P-B4": 40,
      "D-P-RF2": 25,
      "D-P-P.A": 75,
      "D-P-CNC": 20,
      "D-P-LPP2": 100,
      "D-P-STJ": 90,
      "D-P-SCA-REB": 80,
      "D-P-DAF-REB": 20,
      "P-M-VM": 200,
    }, { rf3: 1_000, beatty1: 900, beatty2: 920, beatty3: 940, beatty4: 960, lct: 880, pa: 860, cnc: 840, paint: 960, stenhoj: 960 });

    expect(values).toEqual({
      "T-RF3": 1_000 / 100 / 1_440,
      "T-B1": 900 / 50 / 1_440,
      "T-B2": 920 / 20 / 1_440,
      "T-B3": 940 / 80 / 1_440,
      "T-B4": 960 / 40 / 1_440,
      "T-LCT/RF2": 880 / 25 / 1_440,
      "T-P.A": 860 / 75 / 1_440,
      "T-CNC": 840 / 20 / 1_440,
      "T-LPP2": 960 / 100 / 1_440,
      "T-STJ": 960 / 90 / 1_440,
      "T-SCA-REB": 960 / 80 / 1_440,
      "T-DAF-REB": 960 / 20 / 1_440,
      "T-EMB-VM": 1 / 200,
      "T-M3": 0,
    });
  });

  it("não publica medidas sem demanda válida", () => {
    expect(calculateLayoutProcessMeasures({ "D-P-RF3": 0 }, { rf3: 1_000, beatty1: 0, beatty2: 0, beatty3: 0, beatty4: 0, lct: 0, pa: 0, cnc: 0, paint: 0, stenhoj: 0 })).toEqual({ "T-M3": 0 });
  });

  it("mostra dias pequenos sem transformar valor real em zero visual", () => {
    expect(formatProcessDays(0)).toBe("0,000");
    expect(formatProcessDays(.0006)).toBe("0,001");
    expect(formatProcessDays(.0004)).toBe("0,00040");
    expect(formatProcessDays(.0012)).toBe("0,001");
  });
});
