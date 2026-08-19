import { describe, expect, it } from "vitest";
import { base1Client, deriveRf3Demand } from "../../../api/src/oracle/layout-measure-formulas.js";

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
    const values = deriveRf3Demand([
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
    });
  });
});
