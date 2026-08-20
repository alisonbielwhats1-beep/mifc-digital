import type { LayoutClientKey } from "@/domain/client-process-matrix";

export interface ClientTotalInput {
  key: string;
  label: string;
  value: number;
  multiplier: number;
  origin: "CONSTANT" | "MEASURE";
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

interface TotalDefinition {
  measureKey: string;
  movementCount: number;
  components: string[];
}

const definitions: Record<LayoutClientKey, TotalDefinition> = {
  FH: {
    measureKey: "T-T-FH",
    movementCount: 7,
    components: ["E-D-P-LCT", "Q-D-FH", "E-D-P-RF2", "E-P-D-FH-RF3", "E-P-D-FH-M3", "D-E-FH-B", "D-E-FH-CL", "D-E-FH-P.I", "D-E-FH-P.A", "E-P-D-FH-STJ", "E-P-D-FH-EMB"],
  },
  VM: {
    measureKey: "T-T-VM",
    movementCount: 8,
    components: ["Q-D-VM", "E-P-D-VM-RF3", "D-E-VM-B", "D-E-VM-CL", "D-E-VM-P.I", "E-P-D-VM-EMB"],
  },
  SCA: {
    measureKey: "T-T-SCA",
    movementCount: 8,
    components: ["Q-D-SCA", "E-P-D-SCA-RF3", "E-P-D-SCA-M3", "D-E-SCA-B", "D-E-SCA-P.A", "D-E-SCA-CL", "D-E-SCA-P.I", "D-E-SCA-REB", "E-P-D-SCA-STJ", "E-P-D-SCA-EMB"],
  },
  DAF: {
    measureKey: "T-T-DAF",
    movementCount: 8,
    components: ["Q-D-DAF", "E-P-D-DAF-RF3", "E-P-D-DAF-M3", "D-E-DAF-B", "D-E-DAF-CL", "D-E-DAF-P.I", "D-E-DAF-REB", "E-P-D-DAF-STJ", "E-P-D-DAF-EMB"],
  },
};

export function calculateClientTotal(
  clientKey: LayoutClientKey,
  values: Record<string, number> | null,
): ClientTotalResult {
  const definition = definitions[clientKey];
  const sourceValues = values ?? {};
  const missingKeys = definition.components.filter((key) => !Number.isFinite(sourceValues[key]));
  const inputs: ClientTotalInput[] = [
    { key: "T-T", label: "Tempo de transporte", value: 4 / 24, multiplier: 1, origin: "CONSTANT" },
    { key: "T-M", label: "Tempo de movimentação", value: 5 / 1440, multiplier: definition.movementCount, origin: "CONSTANT" },
    ...definition.components
      .filter((key) => Number.isFinite(sourceValues[key]))
      .map((key) => ({ key, label: key, value: sourceValues[key], multiplier: 1, origin: "MEASURE" as const })),
  ];
  const value = missingKeys.length
    ? undefined
    : inputs.reduce((total, input) => total + input.value * input.multiplier, 0);
  const formula = `[T-T] + ([T-M] × ${definition.movementCount}) + ${definition.components.map((key) => `[${key}]`).join(" + ")}`;
  return {
    clientKey,
    measureKey: definition.measureKey,
    value,
    missingKeys,
    inputs,
    formula,
    sourceReference: "MIFC.SemanticModel/definition/tables/1-Measure.tmdl",
  };
}
