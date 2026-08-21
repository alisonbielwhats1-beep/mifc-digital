export type EntityId = string;

export type DataOrigin =
  | "INPUT"
  | "CALCULATED"
  | "ORACLE_MES"
  | "IMPORT"
  | "MIXED";

export type EntityStatus = "active" | "inactive";
export type RevisionStatus = "draft" | "published" | "archived";
export type ValidationStatus = "pending" | "mapped" | "validated" | "blocked";

export interface AuditFields {
  createdAt: string;
  createdBy: EntityId;
  updatedAt: string;
  updatedBy: EntityId;
}

export interface Plant extends AuditFields {
  id: EntityId;
  code: string;
  name: string;
  timezone: string;
  status: EntityStatus;
}

export interface Scenario extends AuditFields {
  id: EntityId;
  plantId: EntityId;
  year: number;
  code: string;
  name: string;
  status: EntityStatus;
}

export interface Revision extends AuditFields {
  id: EntityId;
  scenarioId: EntityId;
  number: number;
  label: string;
  status: RevisionStatus;
  publishedAt?: string;
  notes?: string;
}

export interface Customer extends AuditFields {
  id: EntityId;
  plantId: EntityId;
  code: string;
  name: string;
  status: EntityStatus;
}

export interface Product extends AuditFields {
  id: EntityId;
  customerId: EntityId;
  code: string;
  name: string;
  averageLengthMm?: number;
  averageWeightKg?: number;
  status: EntityStatus;
}

export interface Vehicle extends AuditFields {
  id: EntityId;
  productId: EntityId;
  code: string;
  model: string;
  status: EntityStatus;
}

export interface VolumeInput extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  customerId: EntityId;
  productId?: EntityId;
  vehicleId?: EntityId;
  vehiclesPerDay: number;
  reinforcementPercent: number;
  workingDays: number;
  shifts: number;
  status: EntityStatus;
}

export interface LogisticsParameter extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  customerId?: EntityId;
  routeCode: string;
  transportMinutes?: number;
  movementMinutes?: number;
  shipmentFrequency?: string;
  shipmentLotSize?: number;
  origin: DataOrigin;
  status: EntityStatus;
}

export type BufferType = "raw_material" | "process" | "finished_goods" | "stagnation";

export interface Buffer extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  code: string;
  name: string;
  type: BufferType;
  capacityPieces?: number;
  targetPieces?: number;
  status: EntityStatus;
}

export interface StockPoint extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  bufferId?: EntityId;
  processId?: EntityId;
  customerId?: EntityId;
  locationCode: string;
  inputProcessId?: EntityId;
  outputProcessId?: EntityId;
  sourceKey?: string;
  fallbackAllowed: boolean;
  status: EntityStatus;
}

export interface WorkingCalendar extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  date: string;
  isWorkingDay: boolean;
  availableMinutes: number;
  shiftCount: number;
  notes?: string;
}

export interface Process extends AuditFields {
  id: EntityId;
  plantId: EntityId;
  code: string;
  name: string;
  sequence: number;
  machineCode?: string;
  status: EntityStatus;
}

export interface ProcessCapacity extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  processId: EntityId;
  cycleTimeSeconds?: number;
  nominalCapacityPerHour?: number;
  shifts: number;
  availableHoursPerDay: number;
  efficiencyPercent?: number;
  targetWipPieces?: number;
  speedUnit?: string;
  origin: DataOrigin;
  validationStatus: ValidationStatus;
  status: EntityStatus;
}

export type MifcNodeType =
  | "process"
  | "storage"
  | "stagnation"
  | "database"
  | "customer_supplier"
  | "truck"
  | "kanban"
  | "information";

export interface MifcNode extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  type: MifcNodeType;
  processId?: EntityId;
  stockPointId?: EntityId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  calculationKey?: string;
  sourceVisualIds: string[];
  properties: Record<string, string | number | boolean | null>;
  validationStatus: ValidationStatus;
}

export type MifcFlowType = "material_pull" | "material_push" | "information" | "electronic_information";

export interface MifcEdge extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  sourceNodeId: EntityId;
  targetNodeId: EntityId;
  flowType: MifcFlowType;
  waypoints: Array<{ x: number; y: number }>;
  validationStatus: ValidationStatus;
}

export interface CalculationRule extends AuditFields {
  id: EntityId;
  code: string;
  name: string;
  version: number;
  category: string;
  unit: string;
  inputKeys: string[];
  dependencyRuleIds: EntityId[];
  sourceReference: string;
  expression: string;
  validationStatus: ValidationStatus;
  status: EntityStatus;
}

export interface CalculationResult extends AuditFields {
  id: EntityId;
  revisionId: EntityId;
  calculationRuleId: EntityId;
  subjectType: string;
  subjectId: EntityId;
  numericValue?: number;
  textValue?: string;
  unit: string;
  origin: DataOrigin;
  calculatedAt: string;
  sourceUpdatedAt?: string;
  isFallback: boolean;
}

export interface OracleConnection extends AuditFields {
  id: EntityId;
  name: string;
  host: string;
  port: number;
  serviceName: string;
  schema?: string;
  usernameReference: string;
  readOnly: true;
  liveReadsEnabled: boolean;
  status: EntityStatus;
}

export interface OracleQueryCatalogEntry extends AuditFields {
  id: EntityId;
  connectionId: EntityId;
  key: string;
  description: string;
  sourceObject: string;
  sqlFingerprint?: string;
  enabled: boolean;
  readOnly: true;
  validationStatus: ValidationStatus;
}

export interface DataSource extends AuditFields {
  id: EntityId;
  name: string;
  kind: "oracle" | "sql_server" | "excel" | "application" | "demo";
  connectionId?: EntityId;
  sourceReference?: string;
  readOnly: boolean;
  status: EntityStatus;
}

export interface AuditLogEntry {
  id: EntityId;
  occurredAt: string;
  actorId: EntityId;
  action: string;
  entityType: string;
  entityId: EntityId;
  revisionId?: EntityId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}

export interface FieldValue<T> {
  value: T;
  origin: DataOrigin;
  sourceLabel: string;
  sourceUpdatedAt?: string;
  editable: boolean;
  fallback: boolean;
  validationStatus: ValidationStatus;
}
