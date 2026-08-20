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
    expect(values["D-E-SCA-P.A"]).toBeCloseTo(0.5);
    expect(values["E-D-P-LCT"]).toBeCloseTo(6);
    expect(values["E-D-P-RF2"]).toBeCloseTo(1);
    expect(values["E-P-D-FH-M3"]).toBeCloseTo(0.5);
  });

  it("calcula os dias de Slitter pelo estoque de lotes e comprimento das peças no Slitter", () => {
    const values = deriveLayoutStockMeasures({
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-1", MP: "MP-FH", FINISH_LENGHT: 8, LOCATION: "Roll Former 3 Input", SHIP_DATE: "19-AUG-2026 08:00" },
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-2", MP: "MP-FH", FINISH_LENGHT: 12, LOCATION: "Roll Former 3 Input", SHIP_DATE: "19-AUG-2026 08:00" },
      ],
      base2: [],
      dafSlitters: [],
      lotes: [
        { MP: "MP-FH", PESO: 7_850, ESPESSURA: 10, LARGURA: 1_000, CREATION_DATE: "18-AUG-2026 08:00" },
      ],
      producao: [
        { RAIL_ID: "nao-usar", "ITEM(m)": 1_000, CREATION_DATE: "19-AUG-2026 08:00" },
      ],
      demand: {},
    }).values;

    expect(values["E-M-P-S-FH"]).toBe(10);
    expect(values["Q-D-FH"]).toBeCloseTo(5);
  });

  it("reproduz o else Slitter da Base1 e mantém os comprimentos Scania quando a fonte dedicada existe", () => {
    const result = deriveLayoutStockMeasures({
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-1", MP: "MP-FH", FINISH_LENGHT: 10, LOCATION: "LOCAL NÃO MAPEADO", SHIP_DATE: "19-AUG-2026 08:00" },
        { PRODUCT_CLASS: "NC", CUSTOMER_CODE: "SCA", ITEM: "1-SCA", COMPONENT: "sca-1", MP: "MP-SCA", FINISH_LENGHT: 20, LOCATION: "OUTRO LOCAL", SHIP_DATE: "19-AUG-2026 08:00" },
      ],
      base2: [],
      dafSlitters: [],
      scania: [],
      lotes: [
        { MP: "MP-FH", "MP(m)": 150 },
        { MP: "MP-SCA", "MP(m)": 300 },
      ],
      demand: {},
    });

    expect(result.rows["slitter-finish-lengths"]).toBe(2);
    expect(result.values["C-P-M-TOTAL"]).toBe(15);
    expect(result.values["E-M-P-S-FH"]).toBe(15);
    expect(result.values["E-M-P-S-SCA"]).toBe(15);
  });

  it("remove o filtro diário ao calcular Q-D e usa o horizonte completo do Slitter", () => {
    const result = deriveLayoutStockMeasures({
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-fg", MP: "MP-FH", FINISH_LENGHT: 9, LOCATION: "Embalaje 1", SHIP_DATE: "19-AUG-2026 08:00" },
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-slitter", MP: "MP-FH", FINISH_LENGHT: 10, LOCATION: " ", SHIP_DATE: "20-AUG-2026 08:00" },
      ],
      base2: [],
      dafSlitters: [],
      lotes: [{ MP: "MP-FH", "MP(m)": 100 }],
      demand: {},
    });

    expect(result.rows["slitter-finish-lengths"]).toBe(1);
    expect(result.values["C-P-M-TOTAL"]).toBe(10);
    expect(result.values["Q-D-FH"]).toBe(10);
  });

  it("aplica a dimensão MP do PBIP para separar os lotes FH e VM", () => {
    const values = deriveLayoutStockMeasures({
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-1", MP: "4-MP600760SL445-0", FINISH_LENGHT: 10, LOCATION: " ", SHIP_DATE: "19-AUG-2026" },
        { PRODUCT_CLASS: "04", CHASSIS_NUMBER: "fh-2", MP: "4-MP600760SL445-0", FINISH_LENGHT: 10, LOCATION: " ", SHIP_DATE: "19-AUG-2026" },
        { PRODUCT_CLASS: "06", CHASSIS_NUMBER: "vm-1", MP: "4-MP600760SL369-0", FINISH_LENGHT: 5, LOCATION: " ", SHIP_DATE: "19-AUG-2026" },
        { PRODUCT_CLASS: "06", CHASSIS_NUMBER: "vm-2", MP: "4-MP600760SL369-0", FINISH_LENGHT: 5, LOCATION: " ", SHIP_DATE: "19-AUG-2026" },
      ],
      base2: [],
      dafSlitters: [],
      lotes: [
        { MP: "4-MP600760SL445-0", DESCRIPTION: "BOBINA VDB", "MP(m)": 100 },
        { MP: "4-MP600760SL369-0", DESCRIPTION: "BOBINA VDB", "MP(m)": 100 },
      ],
      demand: {},
    }).values;

    expect(values["E-M-P-S-FH"]).toBe(10);
    expect(values["E-M-P-S-VM"]).toBe(20);
    expect(values["Q-D-FH"]).toBe(5);
    expect(values["Q-D-VM"]).toBe(10);
  });

  it("recompõe a DAF simples/reforçada antes de excluir a origem Beatty 2", () => {
    const values = deriveLayoutStockMeasures({
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [],
      base2: [
        { CUSTOMER_CODE: "DAF", DESCRIPTION: "BEATTY 2", ITEM: "1-2184071-02", RAIL_TYPE_DESCRIPTION: "Longarina", LOCATION: "Embalaje 1", SHIP_DATE: "19-AUG-2026" },
      ],
      dafSlitters: [],
      demand: {},
    }).values;

    expect(values["Q-D-E-DAF"]).toBe(1);
    expect(values["P-M-DAF"]).toBe(1);
  });
});
