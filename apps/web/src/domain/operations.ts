export type RecordStatus = "active" | "inactive";
export type DataOrigin = "ORACLE_MES" | "LOCAL" | "CALCULATED";
export type ActionBaseStatus = "not_started" | "in_progress" | "waiting" | "completed" | "cancelled";
export type ActionEffectiveStatus = ActionBaseStatus | "overdue";

export interface ProductRecord {
  id: string; code: string; description: string; customer: string; family: string;
  productClass: string; hand: string; finishLength?: number; material: string;
  status: RecordStatus; origin: DataOrigin; sourceKey?: string; updatedAt: string;
  routeProcessIds: string[]; overrides: Partial<Omit<ProductRecord,"id"|"origin"|"sourceKey"|"updatedAt"|"overrides">>;
}

export interface ProcessRecord {
  id: string; code: string; name: string; sequence: number; type: string;
  customerKeys: string[]; productIds: string[]; resourceIds: string[]; layoutNodeId: string;
  powerBiMeasure: string; demandMeasure: string; productionMeasure: string;
  status: RecordStatus; notes: string; validation: "mapped"|"divergent"|"pending"; updatedAt: string;
}

export interface ResourceRecord {
  id: string; code: string; name: string; processId: string; capacityRowId?: string;
  availableHoursPerDay: number; availableMinutes: number; shifts: number; cycleTimeSeconds?: number;
  capacityPerDay?: number; availabilityPercent?: number; oeeTarget?: number;
  productionMeasure?: string; demandMeasure?: string; remainingMeasure?: string;
  programmedStopsMeasure?: string; downtimeMeasure?: string; utilizationMeasure?: string;
  operationalStatus: "operational"|"attention"|"stopped"|"unknown"; status: RecordStatus;
  origin: DataOrigin; updatedAt: string;
}

export interface ActionRecord {
  id: string; number: string; title: string; problem: string; originModule: string;
  productId?: string; processId?: string; resourceId?: string; layoutNodeId?: string;
  cause: string; countermeasure: string; owner: string; priority: "low"|"medium"|"high"|"critical";
  status: ActionBaseStatus; progress: number; openedAt: string; dueAt: string; completedAt?: string;
  expectedImpact: string; evidence: string; notes: string; updatedAt: string;
}

export interface MasterDataRecord {
  id: string; category: string; key: string; label: string; value: string; unit: string;
  origin: DataOrigin; status: RecordStatus; notes: string; updatedAt: string;
}

export interface OperationsSettings {
  autoSave: boolean; compactTables: boolean; confirmDeletes: boolean;
  defaultActionsView: "table"|"kanban"; refreshSeconds: number; showSourceBadges: boolean;
}

export function effectiveActionStatus(action: Pick<ActionRecord,"status"|"dueAt">, now = new Date()): ActionEffectiveStatus {
  if (action.status === "completed" || action.status === "cancelled") return action.status;
  const due = new Date(`${action.dueAt}T23:59:59`);
  return action.dueAt && due.getTime() < now.getTime() ? "overdue" : action.status;
}

export function cloneRecord<T extends { id: string; updatedAt: string }>(record: T, id: string, now = new Date().toISOString()): T {
  return { ...JSON.parse(JSON.stringify(record)) as T, id, updatedAt: now };
}

export function mergeOracleProduct(current: ProductRecord | undefined, incoming: Omit<ProductRecord,"overrides">): ProductRecord {
  const overrides = current?.overrides ?? {};
  return { ...incoming, ...overrides, overrides, origin: "ORACLE_MES", sourceKey: incoming.sourceKey };
}

export const actionStatusLabels: Record<ActionEffectiveStatus,string> = {
  not_started: "Não iniciada", in_progress: "Em andamento", waiting: "Aguardando",
  completed: "Concluída", cancelled: "Cancelada", overdue: "Atrasada",
};
