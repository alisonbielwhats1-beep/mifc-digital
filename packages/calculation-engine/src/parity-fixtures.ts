export interface NumericParityFixture {
  id: string;
  source: string;
  expected: number;
  tolerance: number;
}

export const excelParityReferences = {
  pairsPerDay: [
    { id: "F8", source: "Volume 2023!F8", expected: 127.5, tolerance: 1e-10, vehiclesPerDay: 85, reinforcementPercent: 50 },
    { id: "F9", source: "Volume 2023!F9", expected: 57, tolerance: 1e-10, vehiclesPerDay: 30, reinforcementPercent: 90 },
    { id: "F10", source: "Volume 2023!F10", expected: 162, tolerance: 1e-10, vehiclesPerDay: 108, reinforcementPercent: 50 },
    { id: "F11", source: "Volume 2023!F11", expected: 76, tolerance: 1e-10, vehiclesPerDay: 40, reinforcementPercent: 90 },
  ],
  shifts: [
    { id: "I3", source: "Volume 2023!I3", expected: 511, tolerance: 1e-10, startMinutes: 360, endMinutes: 936, rolloverMinutes: 0, mealMinutes: 60, meetingMinutes: 5 },
    { id: "I4", source: "Volume 2023!I4", expected: 491, tolerance: 1e-10, startMinutes: 936, endMinutes: 1439, rolloverMinutes: 48, mealMinutes: 60, meetingMinutes: 0 },
  ],
  materialStock: [
    { id: "FH", source: "Volume 2023!G8:M8", expectedWeight: 201.60998, expectedDays: 1.633906043271679, averageLengthMm: 7150, widthMm: 449, thicknessMm: 8, densityKgDm3: 7.85, coilCount: 12, coilWeightKg: 7000, pairsPerDay: 127.5 },
    { id: "VM", source: "Volume 2023!G9:M9", expectedWeight: 165.68838, expectedDays: 4.076559843793682, averageLengthMm: 7150, widthMm: 369, thicknessMm: 8, densityKgDm3: 7.85, coilCount: 11, coilWeightKg: 7000, pairsPerDay: 57 },
    { id: "Scania", source: "Volume 2023!G10:M10", expectedWeight: 202.78434, expectedDays: 2.2373705173866174, averageLengthMm: 6600, widthMm: 412, thicknessMm: 9.5, densityKgDm3: 7.85, coilCount: 21, coilWeightKg: 7000, pairsPerDay: 162 },
    { id: "DAF", source: "Volume 2023!G11:M11", expectedWeight: 165.3995, expectedDays: 5.011788841085086, averageLengthMm: 7000, widthMm: 430, thicknessMm: 7, densityKgDm3: 7.85, coilCount: 18, coilWeightKg: 7000, pairsPerDay: 76 },
  ],
  wipDays: [
    { id: "FH-LCT", source: "MIFC-2023!L24", expected: 0.26666666666666666, tolerance: 1e-12, quantityPieces: 68, pairsPerDay: 127.5 },
    { id: "VM-FG", source: "MIFC-2023!BY27", expected: 1.5789473684210527, tolerance: 1e-12, quantityPieces: 180, pairsPerDay: 57 },
    { id: "SCA-FG", source: "MIFC-2023!BY30", expected: 1.037037037037037, tolerance: 1e-12, quantityPieces: 336, pairsPerDay: 162 },
    { id: "DAF-FG", source: "MIFC-2023!BY33", expected: 2.3947368421052633, tolerance: 1e-12, quantityPieces: 364, pairsPerDay: 76 },
  ],
  processTime: [
    { id: "FH-J23", source: "MIFC-2023!J23", expected: 0.0030319535221496005, tolerance: 1e-12, availableMinutes: 1002, demandPieces: 127.5 * 0.9 * 2 },
    { id: "FH-AD23", source: "MIFC-2023!AD23", expected: 0.0027287581699346405, tolerance: 1e-12, availableMinutes: 1002, demandPieces: 127.5 * 2 },
    { id: "VM-AF26", source: "MIFC-2023!AF26", expected: 0.006103801169590643, tolerance: 1e-12, availableMinutes: 1002, demandPieces: 57 * 2 },
    { id: "DAF-AE32", source: "MIFC-2023!AE32", expected: 0.004577850877192983, tolerance: 1e-12, availableMinutes: 1002, demandPieces: 76 * 2 },
  ],
  totals: [
    { id: "FH", source: "MIFC-2023!CV25", expected: 5.669968126620541, tolerance: 1e-12, componentDays: [0.025340227371703234, 5.644627899248837] },
    { id: "VM", source: "MIFC-2023!CV28", expected: 10.566967075340989, tolerance: 1e-12, componentDays: [0.04076919341210465, 10.526197881928884] },
    { id: "Scania", source: "MIFC-2023!CV31", expected: 6.822522570898756, tolerance: 1e-12, componentDays: [0.02843909054917498, 6.794083480349581] },
    { id: "DAF", source: "MIFC-2023!CV34", expected: 11.073098082818607, tolerance: 1e-12, componentDays: [0.04102415401422473, 11.032073928804381] },
  ],
} as const;
