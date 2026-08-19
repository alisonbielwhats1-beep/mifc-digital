import { describe, expect, it } from "vitest";
import {
  excelSerialToDate,
  normalizeShippingScheduleMatrix,
} from "../../../api/src/imports/shipping-schedule.js";
import {
  deriveLayoutStockMeasures,
  shippingRelationshipKey,
} from "../../../api/src/oracle/layout-stock-measures.js";

describe("importação da programação de embarque", () => {
  it("valida as colunas e reproduz as transformações da aba Data Embarque", () => {
    const result = normalizeShippingScheduleMatrix([
      ["Flatbed", "Data", "Horário", "Data__horario"],
      ["SCASB_260819_2", 46253, 1 / 3, null],
      ["VDBCL_260819_1", 46253, 5 / 12, null],
      [46254, 46254, 5 / 12, null],
    ]);

    expect(excelSerialToDate(46253)).toBe("2026-08-19");
    expect(result.rows).toHaveLength(2);
    expect(result.removedTrailingRows).toBe(1);
    expect(result.rows[0]).toMatchObject({
      Flatbed: "SCASB_260819_2",
      Data: "2026-08-19",
      "Horário": "08:00:00",
      Data__horario: "2026-08-19T08:00:00",
      Cliente: "SCA",
    });
    expect(result.clientCounts).toEqual({ SCA: 1, VM: 1 });
  });

  it("recusa arquivos cuja estrutura não contém os cabeçalhos obrigatórios", () => {
    expect(() => normalizeShippingScheduleMatrix([
      ["Flatbed", "Data"],
      ["VDBCL_260819_1", 46253],
    ])).toThrow(/Horário/);
  });

  it("reconstrói as cinco chaves de relacionamento usadas pelo modelo", () => {
    expect(shippingRelationshipKey({ CUSTOMER_CODE: "FH", SHIP_DATE: "19-AUG-2026", FLATBED: 3 }, "FH"))
      .toBe("FH_260819_3");
    expect(shippingRelationshipKey({ CUSTOMER_CODE: "VDB", SHIP_DATE: "19-AUG-2026", FLATBED: 1 }, "VM"))
      .toBe("VDBCL_260819_1");
    expect(shippingRelationshipKey({ PLATAFORMA: "SCASB_260819_2", SHIP_DATE: "19-AUG-2026", FLATBED: 2 }, "SCA"))
      .toBe("SCASB_260819_2");
    expect(shippingRelationshipKey({ SHIP_DATE: "19-AUG-2026" }, "DAF")).toBe("2026-08-19");
    expect(shippingRelationshipKey({ Data: "2026-08-19" }, "DAF")).toBe("2026-08-19");
  });

  it("aplica Data futura, relacionamento e filtro visual de operação no bloco de embalagem", () => {
    const input = {
      contextDate: "2026-08-19",
      todayDate: "2026-08-19",
      base1: [
        { PRODUCT_CLASS: "06", CUSTOMER_CODE: "VDB", CHASSIS_NUMBER: "vm-fg", FLATBED: 1, LOCATION: "Estoque FG", SHIP_DATE: "19-AUG-2026" },
        { PRODUCT_CLASS: "06", CUSTOMER_CODE: "VDB", CHASSIS_NUMBER: "vm-outro-flatbed", FLATBED: 2, LOCATION: "Estoque FG", SHIP_DATE: "19-AUG-2026" },
        { PRODUCT_CLASS: "06", CUSTOMER_CODE: "VDB", CHASSIS_NUMBER: "vm-local-visual", FLATBED: 1, LOCATION: "Beatty Output", SHIP_DATE: "19-AUG-2026" },
      ],
      shippingSchedule: [{ Data: "2026-08-19", Flatbed: "VDBCL_260819_1", relationshipKey: "VDBCL_260819_1" }],
      demand: {},
    };
    const result = deriveLayoutStockMeasures(input);

    expect(result.rows["shipping-related-vm"]).toBe(1);
    expect(result.values["E-P-D-VM-EMB"]).toBeCloseTo(1 / 3);
    const withoutSchedule = deriveLayoutStockMeasures({ ...input, shippingSchedule: undefined });
    expect(withoutSchedule.values).not.toHaveProperty("E-P-D-VM-EMB");
  });
});
