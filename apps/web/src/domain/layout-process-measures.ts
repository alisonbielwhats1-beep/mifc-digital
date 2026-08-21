import { calculateProcessTimeDays } from "@mifc/calculation-engine";

export interface LayoutCapacityMinutes {
  rf3: number;
  beatty1: number;
  beatty2: number;
  beatty3: number;
  beatty4: number;
  lct: number;
  pa: number;
  cnc: number;
  paint: number;
  stenhoj: number;
}

const processDays = (minutes: number, demand: number | undefined): number | undefined =>
  minutes > 0 && Number(demand) > 0 ? calculateProcessTimeDays(minutes, Number(demand)) : undefined;

export function formatProcessDays(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0,000";
  const roundedAtThreeDecimals = Math.round(value * 1_000) / 1_000;
  if (roundedAtThreeDecimals !== 0) return roundedAtThreeDecimals.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  if (Math.abs(value) < .00001) return value < 0 ? "> -0,00001" : "< 0,00001";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
}

/**
 * Formata somente os resultados numéricos. A chave técnica da medida continua
 * disponível na linhagem/tooltip, mas nunca ocupa a faixa visual do cliente.
 * Se qualquer medida necessária estiver ausente, a etapa falha fechada com “—”.
 */
export function formatMeasureValues(
  measureKeys: string[],
  values: Record<string, number>,
): string {
  if (!measureKeys.length) return "—";
  const resolved = measureKeys.map((key) => values[key]);
  if (resolved.some((value) => value === undefined || !Number.isFinite(value))) return "—";
  return resolved.map((value) => formatProcessDays(value)).join(" / ");
}

export function calculateLayoutProcessMeasures(
  demand: Record<string, number> | null,
  capacity: LayoutCapacityMinutes,
): Record<string, number> {
  if (!demand) return {};

  const values: Record<string, number | undefined> = {
    "T-RF3": processDays(capacity.rf3, demand["D-P-RF3"]),
    "T-B1": processDays(capacity.beatty1, demand["D-P-B1"]),
    "T-B2": processDays(capacity.beatty2, demand["D-P-B2"]),
    "T-B3": processDays(capacity.beatty3, demand["D-P-B3"]),
    "T-B4": processDays(capacity.beatty4, demand["D-P-B4"]),
    "T-LCT/RF2": processDays(capacity.lct, demand["D-P-RF2"]),
    "T-P.A": processDays(capacity.pa, demand["D-P-P.A"]),
    "T-CNC": processDays(capacity.cnc, demand["D-P-CNC"]),
    "T-LPP2": processDays(capacity.paint, demand["D-P-LPP2"]),
    "T-STJ": processDays(capacity.stenhoj, demand["D-P-STJ"]),
    "T-SCA-REB": processDays(capacity.stenhoj, demand["D-P-SCA-REB"]),
    "T-DAF-REB": processDays(capacity.stenhoj, demand["D-P-DAF-REB"]),
    "T-EMB-VM": Number(demand["P-M-VM"]) > 0 ? 1 / Number(demand["P-M-VM"]) : undefined,
    "T-M3": 0,
  };

  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, number] => entry[1] !== undefined),
  );
}
