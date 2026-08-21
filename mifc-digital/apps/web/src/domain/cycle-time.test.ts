import { describe, expect, it } from "vitest";
import { automaticCycleTimeStatus, calculateAutomaticCycleTimeSeconds } from "./cycle-time";

describe("tempo de ciclo manual e automático", () => {
  it("converte tempo líquido e produção observada para segundos por unidade técnica", () => {
    expect(calculateAutomaticCycleTimeSeconds({ availableMinutes: 720, productionCount: 90 })).toBe(480);
  });

  it("não fabrica CT quando a fonte ou o denominador não está disponível", () => {
    expect(calculateAutomaticCycleTimeSeconds({ availableMinutes: 720, productionCount: 0 })).toBeUndefined();
    expect(automaticCycleTimeStatus({ sourceConfigured: false, availableMinutes: 720, productionCount: 90 })).toBe("not_available");
    expect(automaticCycleTimeStatus({ sourceConfigured: true, availableMinutes: 720, productionCount: 0 })).toBe("waiting_source");
  });
});
