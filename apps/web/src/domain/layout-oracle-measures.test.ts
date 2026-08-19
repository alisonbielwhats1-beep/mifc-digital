import { describe, expect, it } from "vitest";
import { base1Client, deriveLayoutDemand, deriveLayoutDemandForDate, oracleDateKey } from "../../../api/src/oracle/layout-measure-formulas.js";

describe("medidas Oracle da Roll Former 3", () => {
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
      "P-DAF-S": 5,
      "P-FH-F": 1,
      "P-VM-F": 1,
      "P-T-D": 8,
      "D-P-RF3": 16,
      "D-P-B1": 2,
      "D-P-B2": 10,
      "D-P-B3": 2,
      "D-P-B4": 2,
      "D-P-P.A": 4,
      "D-P-CNC": 10,
      "D-P-RF2": 0,
      "D-P-LPP2": 16,
      "D-P-STJ": 14,
      "D-P-SCA-REB": 2,
      "D-P-DAF-REB": 10,
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

    expect(result.values).toMatchObject({ "P-VM-F": 0.5, "P-FH-F": 0.5, "P-DAF-S": 3.5, "D-P-RF2": 1, "Q-D-E-VM": 2, "P-M-VM": 0.5 });
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
});
