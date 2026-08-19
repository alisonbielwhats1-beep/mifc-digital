import { calculateProcessTimeDays } from "@mifc/calculation-engine";

export interface LayoutCapacityMinutes {
  rf3: number;
  beatty: number;
  paint: number;
  stenhoj: number;
}

const processDays = (minutes: number, demand: number | undefined): number | undefined =>
  minutes > 0 && Number(demand) > 0 ? calculateProcessTimeDays(minutes, Number(demand)) : undefined;

export function calculateLayoutProcessMeasures(
  demand: Record<string, number> | null,
  capacity: LayoutCapacityMinutes,
): Record<string, number> {
  if (!demand) return {};

  const values: Record<string, number | undefined> = {
    "T-RF3": processDays(capacity.rf3, demand["D-P-RF3"]),
    "T-B1": processDays(capacity.beatty, demand["D-P-B1"]),
    "T-B3": processDays(capacity.beatty, demand["D-P-B3"]),
    "T-B4": processDays(capacity.beatty, demand["D-P-B4"]),
    "T-LPP2": processDays(capacity.paint, demand["D-P-LPP2"]),
    "T-STJ": processDays(capacity.stenhoj, demand["D-P-STJ"]),
    "T-SCA-REB": processDays(capacity.stenhoj, demand["D-P-SCA-REB"]),
    "T-DAF-REB": processDays(capacity.stenhoj, demand["D-P-DAF-REB"]),
    "T-M3": 0,
  };

  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, number] => entry[1] !== undefined),
  );
}
