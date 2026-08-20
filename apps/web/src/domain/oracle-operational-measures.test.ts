import { describe, expect, it } from "vitest";
import { deriveOperationalMeasures } from "../../../api/src/oracle/operational-measure-formulas.js";

describe("medidas operacionais materializadas do Power BI", () => {
  it("filtra produção por LOCATION_DATE como o Power BI", () => {
    const result = deriveOperationalMeasures({
      contextDate: "2026-08-19",
      demand: {},
      producao: [
        {
          CREATION_DATE: "2026-08-18T22:00:00",
          LOCATION_DATE: "2026-08-19T06:00:00",
          RAIL_ID: "A",
          DESCRIPTION: "Beatty Alma Output 1",
        },
        {
          CREATION_DATE: "2026-08-18T23:00:00",
          LOCATION_DATE: "2026-08-19T08:00:00",
          RAIL_ID: "B",
          DESCRIPTION: "Beatty Alma Output 1",
        },
        {
          CREATION_DATE: "2026-08-19T18:00:00",
          LOCATION_DATE: "2026-08-20T00:00:00",
          RAIL_ID: "C",
          DESCRIPTION: "Beatty Alma Output 1",
        },
      ],
    });

    expect(result.values["P-B1"]).toBe(2);
    expect(result.rows.producao).toBe(2);
  });

  it("reproduz produção distinta, paradas, estoque e golpes", () => {
    const result = deriveOperationalMeasures({
      contextDate: "2026-08-19",
      demand: { "D-P-RF3": 10, "D-P-B1": 4 },
      producao: [
        { DATA: "2026-08-19", RAIL_ID: 1, DESCRIPTION: "Roll Former 3" },
        { DATA: "2026-08-19", RAIL_ID: 1, DESCRIPTION: "Roll Former 3" },
        { DATA: "2026-08-19", RAIL_ID: 2, DESCRIPTION: "Beatty Alma Output 1" },
        { DATA: "2026-08-18", RAIL_ID: 3, DESCRIPTION: "Roll Former 3" },
      ],
      paradas: [
        { ID_PARADA: 1, PARADA: "2026-08-19T08:00:00", RETORNO: "2026-08-19T08:30:00", CODIGO: "L9", OPERAÇÃO: "ROLLFORMER 3" },
        { ID_PARADA: 2, PARADA: "2026-08-19T10:00:00", RETORNO: "2026-08-19T10:10:00", CODIGO: "X1", OPERAÇÃO: "ROLLFORMER 3" },
      ],
      lotes: [{ "MP(m)": 12.5, DESCRIPTION: "Lote", PESO: 2_000 }],
      punchScania: [{ DATA_EMBARQUE: "2026-08-19", CHASSIS_NUMBER: "A", ALMA: 8, ALMA_BOTH: 4 }],
      punchVolvo: [{ DATA_EMBARQUE: "2026-08-19", CHASSIS_NUMBER: "B", ALMA: 5, ALMA_BOTH: 2 }],
      lctStock: [{ TOTAL: 14 }],
    });

    expect(result.values).toMatchObject({
      "P-RF3": 1,
      "P-B1": 1,
      "P-R-RF3": 9,
      "P-P-RF3": 30,
      "PT-RF3": 40,
      "DT-RF3": 10,
      "C-T-E": 12.5,
      "Q-S-E": 1,
      "P-S-T": 2,
      "Q-G-SCA": 10,
      "Q-G-VDB": 6,
      "E-P-LCT": 14,
    });
  });
});
