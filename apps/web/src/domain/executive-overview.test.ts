import { describe, expect, it } from "vitest";
import { summarizeExecutiveOverview } from "@/domain/executive-overview";

describe("resumo executivo do MIFC", () => {
  it("falha fechado quando as medidas operacionais não estão disponíveis", () => {
    const summary = summarizeExecutiveOverview({
      clientTotals: [],
      buffers: [],
      measureValues: null,
      productionReady: false,
      capacityCandidates: [],
      connected: false,
      lastUpdatedAt: null,
      overdueActions: 0,
    });

    expect(summary.leadTime.value).toBeUndefined();
    expect(summary.valueAdded.value).toBeUndefined();
    expect(summary.nonValueAdded.value).toBeUndefined();
    expect(summary.wip.value).toBeUndefined();
    expect(summary.production.value).toBeUndefined();
    expect(summary.demand.value).toBeUndefined();
    expect(summary.connection.state).toBe("offline");
  });

  it("calcula VA e NVA do mesmo cliente sem misturar rotas", () => {
    const summary = summarizeExecutiveOverview({
      clientTotals: [
        {
          clientKey: "FH",
          measureKey: "LT-TOTAL-FH",
          value: 5,
          missingKeys: [],
          formula: "",
          sourceReference: "",
          inputs: [
            { key: "T-RF3", label: "RF3", value: 0.5, multiplier: 1, origin: "PROCESS" },
            { key: "T-B4", label: "Beatty 4", value: 0.25, multiplier: 1, origin: "PROCESS" },
            { key: "Q-D-FH", label: "Slitter", value: 2, multiplier: 1, origin: "STOCK" },
          ],
        },
      ],
      buffers: [{ quantityPieces: 68, status: "active", origin: "INPUT" }],
      measureValues: { "P-RF3": 100, "D-P-RF3": 120 },
      productionReady: true,
      capacityCandidates: [{ label: "Roll Former 3", capacityPerDay: 100, demandPerDay: 120 }],
      connected: true,
      lastUpdatedAt: "2026-08-20T12:00:00-03:00",
      overdueActions: 2,
    });

    expect(summary.leadTime).toMatchObject({ value: 5, clientKey: "FH" });
    expect(summary.valueAdded.value).toBe(0.75);
    expect(summary.nonValueAdded.value).toBe(4.25);
    expect(summary.wip.value).toBe(68);
    expect(summary.production.value).toBe(100);
    expect(summary.demand.value).toBe(120);
    expect(summary.bottleneck).toMatchObject({ label: "Roll Former 3", utilizationPercent: 120 });
    expect(summary.overdueActions).toBe(2);
  });
});
