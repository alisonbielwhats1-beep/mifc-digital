import { describe, expect, it } from "vitest";
import { base1Client, deriveLayoutDemand, deriveLayoutDemandForDate, oracleDateKey } from "../../../api/src/oracle/layout-measure-formulas.js";
import { deriveLayoutStockMeasures } from "../../../api/src/oracle/layout-stock-measures.js";

describe("medidas Oracle da Roll Former 3", () => {
  it("não publica zero para medidas que dependem de fontes opcionais ausentes", () => {
    const values = deriveLayoutStockMeasures({
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [],
      base2: [],
      dafSlitters: [],
      demand: {},
    }).values;

    expect(values).not.toHaveProperty("Q-D-FH");
    expect(values).not.toHaveProperty("E-D-P-LCT");
    expect(values).not.toHaveProperty("E-D-P-RF2");
    expect(values).not.toHaveProperty("E-P-D-FH-M3");
  });

  it("reproduz a classificação de clientes da expressão Base1", () => {
    expect(base1Client("04")).toBe("FH");
    expect(base1Client("24")).toBe("FH");
    expect(base1Client("06")).toBe("VM");
    expect(base1Client("NC")).toBe("SCA");
    expect(base1Client("16")).toBe("B8");
    expect(base1Client("15")).toBe("B13");
  });

  it("calcula P-T-D e D-P-RF3 conforme as medidas do PBIP", () => {
    const values = deriveLayoutDemand([
      { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-1" },
      { PRODUCT_CLASS: "24", CHASSIS_NUMBER: "fh-2" },
      { PRODUCT_CLASS: "06", CHASSIS_NUMBER: "vm-1" },
      { PRODUCT_CLASS: "15", CHASSIS_NUMBER: "vm-2" },
      { PRODUCT_CLASS: "NC", CUSTOMER_CODE: "SCA", ITEM: "1-X", COMPONENT: "sca-1" },
      { PRODUCT_CLASS: "NR", CUSTOMER_CODE: "SCA", ITEM: "2-X", COMPONENT: "sca-2" },
    ], [
      { CUSTOMER_CODE: "DAF", ITEM: "daf-1" },
      { CUSTOMER_CODE: "DAF", ITEM: "daf-2" },
    ], [
      { JOB_ORACLE: "job-1", QUANTITY_ORDERED: 10, QUANTITY_FINISHED: 4 },
      { JOB_ORACLE: "job-1", QUANTITY_ORDERED: 10, QUANTITY_FINISHED: 4 },
      { JOB_ORACLE: "job-2", QUANTITY_ORDERED: 8, QUANTITY_FINISHED: 6 },
    ]);

    expect(values).toEqual({
      "P-SCA-F": 1,
      "P-DAF-S": 6,
      "P-FH-F": 1,
      "P-VM-F": 1,
      "P-T-D": 9,
      "D-P-RF3": 18,
      "D-P-B1": 2,
      "D-P-B2": 12,
      "D-P-B3": 2,
      "D-P-B4": 2,
      "D-P-P.A": 4,
      "D-P-CNC": 12,
      "D-P-RF2": 0,
      "D-P-LPP2": 18,
      "D-P-STJ": 16,
      "D-P-SCA-REB": 2,
      "D-P-DAF-REB": 12,
      "Q-D-E-VM": 0,
      "P-M-VM": 0,
    });
  });

  it("aplica o mesmo contexto diário de Calendar[Date] e mantém diagnóstico", () => {
    const result = deriveLayoutDemandForDate([
      { PRODUCT_CLASS: "06", CHASSIS_NUMBER: "vm-hoje", SHIP_DATE: "19-AUG-2026 08:00" },
      { PRODUCT_CLASS: "06", CHASSIS_NUMBER: "vm-amanha", SHIP_DATE: "20-AUG-2026 08:00" },
      { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-hoje", MP: "4-MP600450SL411-0", SHIP_DATE: "19-AUG-2026 08:00" },
      { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-outro", SHIP_DATE: "20-AUG-2026 08:00" },
    ], [
      { CUSTOMER_CODE: "DAF", ITEM: "daf-hoje", SHIP_DATE: "19-AUG-2026 08:00" },
      { CUSTOMER_CODE: "DAF", ITEM: "daf-outro", SHIP_DATE: "20-AUG-2026 08:00" },
    ], [
      { JOB_ORACLE: "job-hoje", QUANTITY_ORDERED: 10, QUANTITY_FINISHED: 4, SHIP_DATE: "19-AUG-2026 08:00" },
      { JOB_ORACLE: "job-outro", QUANTITY_ORDERED: 10, QUANTITY_FINISHED: 4, SHIP_DATE: "20-AUG-2026 08:00" },
    ], "2026-08-19", "2026-08-19");

    expect(result.values).toMatchObject({ "P-VM-F": 0.5, "P-FH-F": 0.5, "P-DAF-S": 4, "D-P-RF2": 1, "Q-D-E-VM": 2, "P-M-VM": 0.5 });
    expect(result.diagnostics.rows).toEqual({
      base1: { cached: 4, filtered: 2 },
      base2: { cached: 2, filtered: 1 },
      "daf-slitters": { cached: 2, filtered: 1 },
    });
  });

  it("normaliza os formatos de data devolvidos pelas consultas Oracle", () => {
    expect(oracleDateKey("19-AUG-2026 08:00")).toBe("2026-08-19");
    expect(oracleDateKey("19-AGO-2026 08:00")).toBe("2026-08-19");
    expect(oracleDateKey("2026-08-19T11:00:00.000Z")).toBe("2026-08-19");
    expect(oracleDateKey("19/08/2026")).toBe("2026-08-19");
  });

  it("reproduz estoque por cliente, local, segregação e RF2/LCT", () => {
    const values = deriveLayoutStockMeasures({
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-beatty", LOCATION: "Beatty Alma Output 1", SHIP_DATE: "19-AUG-2026 08:00" },
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-paint", LOCATION: "Pintura Input 2", SHIP_DATE: "19-AUG-2026 08:00" },
        { PRODUCT_CLASS: "06", CHASSIS_NUMBER: "vm-beatty", LOCATION: "Beatty Alma Output 1", SHIP_DATE: "19-AUG-2026 08:00" },
        { PRODUCT_CLASS: "NC", CUSTOMER_CODE: "SCA", ITEM: "1-L-SCA", COMPONENT: "sca-l", LOCATION: "Beatty Alma Output 3", SHIP_DATE: "19-AUG-2026 08:00" },
        { PRODUCT_CLASS: "NC", CUSTOMER_CODE: "SCA", ITEM: "2-R-SCA", COMPONENT: "sca-r", LOCATION: "Pintura Output 2", SHIP_DATE: "19-AUG-2026 08:00" },
      ],
      base2: [
        { CUSTOMER_CODE: "DAF", ITEM: "daf-long", RAIL_TYPE_DESCRIPTION: "Longarina", LOCATION: "Beatty Alma Output 2", SHIP_DATE: "19-AUG-2026 08:00" },
        { CUSTOMER_CODE: "DAF", ITEM: "1-2159711-00", RAIL_TYPE_DESCRIPTION: "Longarina", LOCATION: "Pintura Output 2", SHIP_DATE: "19-AUG-2026 08:00" },
      ],
      segregacao: [
        { RAIL_ID: "seg-fh", Cliente: "FH", "Processos e ENNs.ENN": "Corte e Conformação", LOCATION: "Roll Former 3", Data: "19-AUG-2026" },
      ],
      rf2: [{ "Rail id": "rf2-1", Data: "19-AUG-2026" }, { "Rail id": "rf2-2", Data: "19-AUG-2026" }],
      lctStock: [{ TOTAL: 12, DATA: "19-AUG-2026" }],
      demand: { "D-P-RF2": 4, "D-P-RF3": 10, "D-P-LPP2": 10, "D-P-STJ": 10 },
    }).values;

    expect(values["D-E-FH-B"]).toBeCloseTo(0.5);
    expect(values["D-E-FH-P.I"]).toBeCloseTo(0.125);
    expect(values["D-E-SCA-REB"]).toBeCloseTo(0.5);
    expect(values["E-D-P-LCT"]).toBeCloseTo(6);
    expect(values["E-D-P-RF2"]).toBeCloseTo(1);
    expect(values["E-P-D-FH-M3"]).toBeCloseTo(0.5);
  });
});
