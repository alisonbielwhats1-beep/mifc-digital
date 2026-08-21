export interface MeasureLineageEntry {
  measure: string;
  description: string;
  dependencies: string[];
  directTables: string[];
  upstreamTables: string[];
  sourceClass: string;
  displayFolder: string;
  formatString: string;
  formula: string;
  cardCount: number;
  clients: string[];
}

export interface CalculationLineageNode {
  id: string;
  key?: string;
  label: string;
  description?: string;
  formula?: string;
  value?: number;
  textValue?: string;
  unit?: string;
  origin?: string;
  source?: string;
  children: CalculationLineageNode[];
}
