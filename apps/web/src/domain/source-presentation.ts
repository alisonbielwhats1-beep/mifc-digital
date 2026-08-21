import type { DataOrigin } from "@mifc/domain";

export interface SourcePresentation {
  label: string;
  description: string;
  editable: boolean;
  tone: "input" | "calculated" | "mes" | "import" | "mixed";
}

const presentations: Record<DataOrigin, SourcePresentation> = {
  INPUT: { label: "Input", description: "Preenchido nesta revisão", editable: true, tone: "input" },
  CALCULATED: { label: "Calculado", description: "Resultado do motor de cálculo", editable: false, tone: "calculated" },
  ORACLE_MES: { label: "MES", description: "Leitura online do Oracle MES", editable: false, tone: "mes" },
  IMPORT: { label: "Importado", description: "Valor recebido de arquivo autorizado", editable: false, tone: "import" },
  MIXED: { label: "Misto", description: "Combina parâmetro e dado realizado", editable: false, tone: "mixed" },
};

export function getSourcePresentation(origin: DataOrigin): SourcePresentation {
  return presentations[origin];
}
