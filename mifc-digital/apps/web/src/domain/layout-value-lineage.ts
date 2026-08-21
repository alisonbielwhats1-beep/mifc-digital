import type { LayoutClientKey } from "@/domain/client-process-matrix";

export interface ClientTotalInput {
  key: string;
  label: string;
  value?: number;
  multiplier: number;
  origin: "INPUT" | "STOCK" | "PROCESS";
}

export interface ClientTotalParameters {
  transportHours?: number;
  beneficiatorDays?: number;
  movementMinutes?: number;
  processValues?: Record<string, number> | null;
}

export interface ClientTotalResult {
  clientKey: LayoutClientKey;
  measureKey: string;
  value?: number;
  missingKeys: string[];
  inputs: ClientTotalInput[];
  formula: string;
  sourceReference: string;
}

export interface LayoutTraceInput {
  key: string;
  label: string;
  value?: number;
  textValue?: string;
  unit: string;
  origin: string;
}

export interface LayoutValueTrace {
  id: string;
  title: string;
  displayValue: string;
  unit: string;
  formula: string;
  simpleExplanation: string;
  inputs: LayoutTraceInput[];
  intermediateResults: string[];
  origin: string;
  measureKeys: string[];
  filters: string[];
  client?: string;
  process?: string;
  date: string;
  updatedAt?: string | null;
  sourceReference: string;
  missingKeys: string[];
}

interface TotalDefinition {
  measureKey: string;
  movementCount: number;
  stockComponents: string[];
  processComponents: string[];
}

const definitions: Record<LayoutClientKey, TotalDefinition> = {
  FH: {
    measureKey: "LT-TOTAL-FH",
    movementCount: 7,
    stockComponents: ["E-D-P-LCT", "Q-D-FH", "E-D-P-RF2", "E-P-D-FH-RF3", "E-P-D-FH-M3", "D-E-FH-B", "D-E-FH-CL", "D-E-FH-P.I", "D-E-FH-P.A", "E-P-D-FH-STJ", "E-P-D-FH-EMB"],
    processComponents: ["T-LCT/RF2", "T-RF3", "T-M3", "T-B4", "T-P.A", "T-LPP2", "T-STJ"],
  },
  VM: {
    measureKey: "LT-TOTAL-VM",
    movementCount: 8,
    stockComponents: ["Q-D-VM", "E-P-D-VM-RF3", "D-E-VM-B", "D-E-VM-CL", "D-E-VM-P.I", "E-P-D-VM-EMB"],
    processComponents: ["T-RF3", "T-B1", "T-CNC", "T-LPP2", "T-EMB-VM"],
  },
  SCA: {
    measureKey: "LT-TOTAL-SCA",
    movementCount: 8,
    stockComponents: ["Q-D-SCA", "E-P-D-SCA-RF3", "E-P-D-SCA-M3", "D-E-SCA-B", "D-E-SCA-P.A", "D-E-SCA-CL", "D-E-SCA-P.I", "D-E-SCA-REB", "E-P-D-SCA-STJ", "E-P-D-SCA-EMB"],
    processComponents: ["T-RF3", "T-M3", "T-B3", "T-P.A", "T-LPP2", "T-SCA-REB", "T-STJ"],
  },
  DAF: {
    measureKey: "LT-TOTAL-DAF",
    movementCount: 8,
    stockComponents: ["Q-D-DAF", "E-P-D-DAF-RF3", "E-P-D-DAF-M3", "D-E-DAF-B", "D-E-DAF-CL", "D-E-DAF-P.I", "D-E-DAF-REB", "E-P-D-DAF-STJ", "E-P-D-DAF-EMB"],
    processComponents: ["T-RF3", "T-M3", "T-B2", "T-CNC", "T-LPP2", "T-DAF-REB", "T-STJ"],
  },
};

const validInput = (value: number | undefined): value is number => Number.isFinite(value) && Number(value) >= 0;

export function calculateClientTotal(
  clientKey: LayoutClientKey,
  values: Record<string, number> | null,
  parameters: ClientTotalParameters = {},
): ClientTotalResult {
  const definition = definitions[clientKey];
  const sourceValues = values ?? {};
  const processValues = parameters.processValues ?? {};
  const manualInputs = [
    { key: "T-T", missingKey: "INPUT:transportHours", label: "Tempo de transporte", value: validInput(parameters.transportHours) ? parameters.transportHours / 24 : undefined, multiplier: 1, origin: "INPUT" as const },
    { key: "T-B", missingKey: "INPUT:beneficiatorDays", label: "Tempo no Beneficiador", value: validInput(parameters.beneficiatorDays) ? parameters.beneficiatorDays : undefined, multiplier: 1, origin: "INPUT" as const },
    { key: "T-M", missingKey: "INPUT:movementMinutes", label: "Tempo de movimentação", value: validInput(parameters.movementMinutes) ? parameters.movementMinutes / 1440 : undefined, multiplier: definition.movementCount, origin: "INPUT" as const },
  ];
  const missingKeys = [
    ...manualInputs.filter((input) => input.value === undefined).map((input) => input.missingKey),
    ...definition.stockComponents.filter((key) => !Number.isFinite(sourceValues[key])),
    ...definition.processComponents.filter((key) => !Number.isFinite(processValues[key])),
  ];
  const inputs: ClientTotalInput[] = [
    ...manualInputs.map((input) => ({ key: input.key, label: input.label, value: input.value, multiplier: input.multiplier, origin: input.origin })),
    ...definition.stockComponents.map((key) => ({ key, label: `Estoque/espera ${key}`, value: Number.isFinite(sourceValues[key]) ? sourceValues[key] : undefined, multiplier: 1, origin: "STOCK" as const })),
    ...definition.processComponents.map((key) => ({ key, label: `Tempo de máquina ${key}`, value: Number.isFinite(processValues[key]) ? processValues[key] : undefined, multiplier: 1, origin: "PROCESS" as const })),
  ];
  const value = missingKeys.length
    ? undefined
    : inputs.reduce((total, input) => total + Number(input.value) * input.multiplier, 0);
  const formula = `(Transporte h ÷ 24) + Beneficiador dias + (Movimentação min ÷ 1.440 × ${definition.movementCount}) + ${definition.stockComponents.map((key) => `[${key}]`).join(" + ")} + ${definition.processComponents.map((key) => `[${key}]`).join(" + ")}`;
  return {
    clientKey,
    measureKey: definition.measureKey,
    value,
    missingKeys,
    inputs,
    formula,
    sourceReference: "Parâmetros manuais + medidas Power BI reproduzidas localmente; regra funcional LT-TOTAL sem subtotal de ENN",
  };
}
