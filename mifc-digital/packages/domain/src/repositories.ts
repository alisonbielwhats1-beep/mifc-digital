import type {
  AuditLogEntry,
  CalculationResult,
  Customer,
  EntityId,
  MifcEdge,
  MifcNode,
  Plant,
  Process,
  Revision,
  Scenario,
  VolumeInput,
} from "./model.js";

export interface ReadRepository<T> {
  getById(id: EntityId): Promise<T | null>;
  list(): Promise<T[]>;
}

export interface RevisionScopedRepository<T> extends ReadRepository<T> {
  listByRevision(revisionId: EntityId): Promise<T[]>;
  saveForRevision(revisionId: EntityId, value: T): Promise<T>;
}

export interface ApplicationRepositories {
  plants: ReadRepository<Plant>;
  scenarios: ReadRepository<Scenario>;
  revisions: ReadRepository<Revision>;
  customers: ReadRepository<Customer>;
  processes: ReadRepository<Process>;
  volumes: RevisionScopedRepository<VolumeInput>;
  mifcNodes: RevisionScopedRepository<MifcNode>;
  mifcEdges: RevisionScopedRepository<MifcEdge>;
  calculationResults: RevisionScopedRepository<CalculationResult>;
  auditLog: ReadRepository<AuditLogEntry>;
}
