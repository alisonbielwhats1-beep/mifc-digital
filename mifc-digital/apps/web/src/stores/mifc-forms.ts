import type { DataOrigin } from "@mifc/domain";
import { defineStore } from "pinia";
import type { CycleTimeMode } from "@/domain/cycle-time";

export type RowStatus = "active" | "inactive";
export type BufferDirection = "entrada" | "saída";

export interface ShiftRow {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  rolloverMinutes: number;
  mealMinutes: number;
  meetingMinutes: number;
  status: RowStatus;
}

export interface VolumeFormRow {
  id: string;
  customer: string;
  model: string;
  vehiclesPerDay: number;
  reinforcementPercent: number;
  workingDays: number;
  shifts: number;
  averageLengthMm: number;
  widthMm: number;
  thicknessMm: number;
  densityKgDm3: number;
  coilCount: number;
  coilWeightKg: number;
  status: RowStatus;
}

export interface LogisticsFormRow {
  id: string;
  customer: string;
  vehicle: string;
  flatbed: string;
  plannedDate: string;
  shipDate: string;
  plannedTime: string;
  transportHours: number;
  beneficiatorDays: number;
  movementMinutes: number;
  shipmentFrequency: string;
  shipmentLotSize: number;
  material: string;
  item: string;
  location: string;
  orderedQuantity: number | null;
  finishedQuantity: number | null;
  mesOrigin: DataOrigin;
  status: RowStatus;
}

export interface BufferFormRow {
  id: string;
  customer: string;
  point: string;
  direction: BufferDirection;
  type: "matéria-prima" | "processo" | "produto acabado" | "estagnação";
  quantityPieces: number;
  capacityPieces: number;
  pairsPerDay: number;
  inputProcess: string;
  outputProcess: string;
  origin: "INPUT" | "ORACLE_MES";
  sourceUpdatedAt?: string;
  status: RowStatus;
}

export interface CapacityFormRow {
  id: string;
  sequence: number;
  processCode: string;
  process: string;
  cycleTimeMode: CycleTimeMode;
  cycleTimeSeconds: number;
  nominalCapacityPerHour: number;
  referenceCapacityPerDay: number | null;
  shifts: number;
  availableHoursPerDay: number;
  efficiencyPercent: number;
  targetWipPieces: number;
  speedUnit: string;
  status: RowStatus;
}

interface FormsSnapshot {
  schemaVersion: 3;
  shiftRows: ShiftRow[];
  volumeRows: VolumeFormRow[];
  logisticsRows: LogisticsFormRow[];
  bufferRows: BufferFormRow[];
  capacityRows: CapacityFormRow[];
  savedAt?: string;
}

const legacyStorageKey = "mifc-digital:prompt-3:revision-04";
const revisionStorageKey = (revisionId: string) => `mifc-digital:prompt-3:${revisionId}`;

const defaults: FormsSnapshot = {
  schemaVersion: 3,
  shiftRows: [
    { id: "shift-1", label: "1º turno", startTime: "06:00", endTime: "15:36", rolloverMinutes: 0, mealMinutes: 60, meetingMinutes: 5, status: "active" },
    { id: "shift-2", label: "2º turno", startTime: "15:36", endTime: "23:59", rolloverMinutes: 48, mealMinutes: 60, meetingMinutes: 0, status: "active" },
  ],
  volumeRows: [
    { id: "vol-fh", customer: "Volvo FH", model: "FH", vehiclesPerDay: 85, reinforcementPercent: 50, workingDays: 250, shifts: 2, averageLengthMm: 7150, widthMm: 449, thicknessMm: 8, densityKgDm3: 7.85, coilCount: 12, coilWeightKg: 7000, status: "active" },
    { id: "vol-vm", customer: "Volvo VM", model: "VM", vehiclesPerDay: 30, reinforcementPercent: 90, workingDays: 250, shifts: 2, averageLengthMm: 7150, widthMm: 369, thicknessMm: 8, densityKgDm3: 7.85, coilCount: 11, coilWeightKg: 7000, status: "active" },
    { id: "vol-scania", customer: "Scania", model: "Longarina", vehiclesPerDay: 108, reinforcementPercent: 50, workingDays: 250, shifts: 2, averageLengthMm: 6600, widthMm: 412, thicknessMm: 9.5, densityKgDm3: 7.85, coilCount: 21, coilWeightKg: 7000, status: "active" },
    { id: "vol-daf", customer: "DAF", model: "Chassi", vehiclesPerDay: 40, reinforcementPercent: 90, workingDays: 250, shifts: 2, averageLengthMm: 7000, widthMm: 430, thicknessMm: 7, densityKgDm3: 7.85, coilCount: 18, coilWeightKg: 7000, status: "active" },
  ],
  logisticsRows: [
    { id: "log-fh", customer: "Volvo FH", vehicle: "FH", flatbed: "", plannedDate: "2026-01-05", shipDate: "", plannedTime: "06:00", transportHours: 4, beneficiatorDays: 0, movementMinutes: 5, shipmentFrequency: "Diária", shipmentLotSize: 0, material: "Aguardando MES", item: "Aguardando MES", location: "Aguardando MES", orderedQuantity: null, finishedQuantity: null, mesOrigin: "ORACLE_MES", status: "active" },
    { id: "log-vm", customer: "Volvo VM", vehicle: "VM", flatbed: "", plannedDate: "2026-01-05", shipDate: "", plannedTime: "08:00", transportHours: 4, beneficiatorDays: 0, movementMinutes: 5, shipmentFrequency: "Diária", shipmentLotSize: 0, material: "Aguardando MES", item: "Aguardando MES", location: "Aguardando MES", orderedQuantity: null, finishedQuantity: null, mesOrigin: "ORACLE_MES", status: "active" },
    { id: "log-scania", customer: "Scania", vehicle: "Longarina", flatbed: "", plannedDate: "2026-01-05", shipDate: "", plannedTime: "10:00", transportHours: 4, beneficiatorDays: 0, movementMinutes: 5, shipmentFrequency: "Diária", shipmentLotSize: 0, material: "Aguardando MES", item: "Aguardando MES", location: "Aguardando MES", orderedQuantity: null, finishedQuantity: null, mesOrigin: "ORACLE_MES", status: "active" },
    { id: "log-daf", customer: "DAF", vehicle: "Chassi", flatbed: "", plannedDate: "2026-01-05", shipDate: "", plannedTime: "12:00", transportHours: 4, beneficiatorDays: 0, movementMinutes: 5, shipmentFrequency: "Diária", shipmentLotSize: 0, material: "Aguardando MES", item: "Aguardando MES", location: "Aguardando MES", orderedQuantity: null, finishedQuantity: null, mesOrigin: "ORACLE_MES", status: "active" },
  ],
  bufferRows: [
    { id: "buf-fh-lct-in", customer: "Volvo FH", point: "LCT", direction: "entrada", type: "processo", quantityPieces: 68, capacityPieces: 120, pairsPerDay: 127.5, inputProcess: "Slitter", outputProcess: "RF2", origin: "INPUT", status: "active" },
    { id: "buf-fh-lct-out", customer: "Volvo FH", point: "LCT", direction: "saída", type: "processo", quantityPieces: 0, capacityPieces: 120, pairsPerDay: 127.5, inputProcess: "LCT", outputProcess: "RF2", origin: "INPUT", status: "active" },
    { id: "buf-vm-rf2", customer: "Volvo VM", point: "RF2", direction: "entrada", type: "processo", quantityPieces: 0, capacityPieces: 100, pairsPerDay: 57, inputProcess: "LCT", outputProcess: "RF2", origin: "INPUT", status: "active" },
    { id: "buf-sca-rf3", customer: "Scania", point: "RF3", direction: "entrada", type: "processo", quantityPieces: 0, capacityPieces: 160, pairsPerDay: 162, inputProcess: "RF2", outputProcess: "RF3", origin: "INPUT", status: "active" },
    { id: "buf-daf-paint", customer: "DAF", point: "Pintura Pós-Rebitagem", direction: "entrada", type: "estagnação", quantityPieces: 0, capacityPieces: 150, pairsPerDay: 76, inputProcess: "Montagem", outputProcess: "Pintura", origin: "INPUT", status: "active" },
  ],
  capacityRows: [
    { id: "cap-rf3", sequence: 1, processCode: "P-001", process: "Roll Former 3", cycleTimeMode: "automatic", cycleTimeSeconds: 48, nominalCapacityPerHour: 75, referenceCapacityPerDay: 1200, shifts: 2, availableHoursPerDay: 16.7, efficiencyPercent: 85, targetWipPieces: 68, speedUnit: "peças/h", status: "active" },
    { id: "cap-beatty", sequence: 2, processCode: "P-002-B1", process: "Beatty 1", cycleTimeMode: "automatic", cycleTimeSeconds: 62, nominalCapacityPerHour: 58, referenceCapacityPerDay: 928, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 82, targetWipPieces: 132, speedUnit: "peças/h", status: "active" },
    { id: "cap-beatty-2", sequence: 3, processCode: "P-002-B2", process: "Beatty 2", cycleTimeMode: "automatic", cycleTimeSeconds: 62, nominalCapacityPerHour: 58, referenceCapacityPerDay: 928, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 82, targetWipPieces: 132, speedUnit: "peças/h", status: "active" },
    { id: "cap-beatty-3", sequence: 4, processCode: "P-002-B3", process: "Beatty 3", cycleTimeMode: "automatic", cycleTimeSeconds: 62, nominalCapacityPerHour: 58, referenceCapacityPerDay: 928, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 82, targetWipPieces: 132, speedUnit: "peças/h", status: "active" },
    { id: "cap-beatty-4", sequence: 5, processCode: "P-002-B4", process: "Beatty 4", cycleTimeMode: "automatic", cycleTimeSeconds: 62, nominalCapacityPerHour: 58, referenceCapacityPerDay: 928, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 82, targetWipPieces: 132, speedUnit: "peças/h", status: "active" },
    { id: "cap-lct", sequence: 6, processCode: "P-005", process: "LCT", cycleTimeMode: "manual", cycleTimeSeconds: 0, nominalCapacityPerHour: 0, referenceCapacityPerDay: null, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 90, targetWipPieces: 0, speedUnit: "peças/h", status: "active" },
    { id: "cap-rf2", sequence: 7, processCode: "P-005-RF2", process: "Roll Former 2", cycleTimeMode: "manual", cycleTimeSeconds: 0, nominalCapacityPerHour: 0, referenceCapacityPerDay: null, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 90, targetWipPieces: 0, speedUnit: "peças/h", status: "active" },
    { id: "cap-pa", sequence: 8, processCode: "P-006", process: "P.A", cycleTimeMode: "automatic", cycleTimeSeconds: 0, nominalCapacityPerHour: 0, referenceCapacityPerDay: null, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 90, targetWipPieces: 0, speedUnit: "peças/h", status: "active" },
    { id: "cap-cnc", sequence: 9, processCode: "P-007", process: "CNC Plasma", cycleTimeMode: "automatic", cycleTimeSeconds: 0, nominalCapacityPerHour: 0, referenceCapacityPerDay: null, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 90, targetWipPieces: 0, speedUnit: "peças/h", status: "active" },
    { id: "cap-paint", sequence: 10, processCode: "P-003", process: "Pintura", cycleTimeMode: "automatic", cycleTimeSeconds: 110, nominalCapacityPerHour: 33, referenceCapacityPerDay: 528, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 60, targetWipPieces: 150, speedUnit: "peças/h", status: "active" },
    { id: "cap-stenhoj", sequence: 11, processCode: "P-004", process: "Stenhoj", cycleTimeMode: "automatic", cycleTimeSeconds: 60, nominalCapacityPerHour: 60, referenceCapacityPerDay: 960, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 90, targetWipPieces: 110, speedUnit: "peças/h", status: "active" },
  ],
};

function cloneDefaults(): FormsSnapshot {
  return structuredClone(defaults);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type StoredFormsSnapshot = Omit<FormsSnapshot, "schemaVersion" | "logisticsRows"> & {
  schemaVersion: 1 | 2 | 3;
  logisticsRows: Array<Omit<LogisticsFormRow, "beneficiatorDays"> & { beneficiatorDays?: number }>;
};

function isSnapshot(value: unknown): value is StoredFormsSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredFormsSnapshot>;
  return [1, 2, 3].includes(candidate.schemaVersion ?? 0)
    && Array.isArray(candidate.volumeRows)
    && Array.isArray(candidate.logisticsRows)
    && Array.isArray(candidate.bufferRows)
    && Array.isArray(candidate.capacityRows)
    && Array.isArray(candidate.shiftRows);
}

function migrateSnapshot(snapshot: StoredFormsSnapshot): FormsSnapshot {
  const migrated = structuredClone(snapshot) as StoredFormsSnapshot;
  for (const row of migrated.logisticsRows) {
    if (!Number.isFinite(row.beneficiatorDays) || Number(row.beneficiatorDays) < 0) row.beneficiatorDays = 0;
  }
  const genericBeatty = migrated.capacityRows.find((row) => row.id === "cap-beatty");
  for (const row of migrated.capacityRows) {
    if (row.cycleTimeMode !== "manual" && row.cycleTimeMode !== "automatic") row.cycleTimeMode = "manual";
  }
  if (genericBeatty) Object.assign(genericBeatty, { process: "Beatty 1", processCode: "P-002-B1" });
  for (const defaultRow of defaults.capacityRows) {
    if (migrated.capacityRows.some((row) => row.id === defaultRow.id)) continue;
    if (genericBeatty && /^cap-beatty-[234]$/.test(defaultRow.id)) {
      migrated.capacityRows.push({ ...structuredClone(genericBeatty), id: defaultRow.id, process: defaultRow.process, processCode: defaultRow.processCode });
    } else migrated.capacityRows.push(structuredClone(defaultRow));
  }
  const canonicalOrder = defaults.capacityRows.map((row) => row.id);
  migrated.capacityRows.sort((left, right) => {
    const leftIndex = canonicalOrder.indexOf(left.id); const rightIndex = canonicalOrder.indexOf(right.id);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
  migrated.capacityRows.forEach((row, index) => { row.sequence = index + 1; });
  return { ...migrated, logisticsRows: migrated.logisticsRows as LogisticsFormRow[], schemaVersion: 3 };
}

export const useMifcFormsStore = defineStore("mifc-forms", {
  state: () => ({
    ...cloneDefaults(),
    activeRevisionId: "layout-rev-04",
    hydrated: false,
    persistedState: "" as string,
  }),
  getters: {
    isDirty(state): boolean {
      if (!state.hydrated) return false;
      return JSON.stringify({
        shiftRows: state.shiftRows,
        volumeRows: state.volumeRows,
        logisticsRows: state.logisticsRows,
        bufferRows: state.bufferRows,
        capacityRows: state.capacityRows,
      }) !== state.persistedState;
    },
  },
  actions: {
    hydrate(revisionId?: string) {
      const targetRevisionId = revisionId ?? this.activeRevisionId;
      if (this.hydrated && targetRevisionId === this.activeRevisionId) return;
      const fallback = cloneDefaults();
      Object.assign(this, fallback);
      this.activeRevisionId = targetRevisionId;
      try {
        const raw = localStorage.getItem(revisionStorageKey(targetRevisionId))
          ?? (targetRevisionId === "layout-rev-04" ? localStorage.getItem(legacyStorageKey) : null);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (isSnapshot(parsed)) {
          const migrated = migrateSnapshot(parsed);
          this.schemaVersion = migrated.schemaVersion;
          this.shiftRows = migrated.shiftRows;
          this.volumeRows = migrated.volumeRows;
          this.logisticsRows = migrated.logisticsRows;
          this.bufferRows = migrated.bufferRows;
          this.capacityRows = migrated.capacityRows;
          this.savedAt = migrated.savedAt;
        }
      } catch {
        // O formulário continua com o snapshot local de demonstração.
      }
      this.persistedState = this.serializedRows();
      this.hydrated = true;
    },
    serializedRows() {
      return JSON.stringify({
        shiftRows: this.shiftRows,
        volumeRows: this.volumeRows,
        logisticsRows: this.logisticsRows,
        bufferRows: this.bufferRows,
        capacityRows: this.capacityRows,
      });
    },
    save() {
      this.savedAt = new Date().toISOString();
      const snapshot: FormsSnapshot = {
        schemaVersion: 3,
        shiftRows: this.shiftRows,
        volumeRows: this.volumeRows,
        logisticsRows: this.logisticsRows,
        bufferRows: this.bufferRows,
        capacityRows: this.capacityRows,
        savedAt: this.savedAt,
      };
      localStorage.setItem(revisionStorageKey(this.activeRevisionId), JSON.stringify(snapshot));
      this.persistedState = this.serializedRows();
    },
    cloneRevision(sourceRevisionId: string, targetRevisionId: string) {
      if (this.activeRevisionId === sourceRevisionId && this.hydrated) this.save();
      const source = localStorage.getItem(revisionStorageKey(sourceRevisionId))
        ?? (sourceRevisionId === "layout-rev-04" ? localStorage.getItem(legacyStorageKey) : null)
        ?? JSON.stringify({
          schemaVersion: 3,
          shiftRows: this.shiftRows,
          volumeRows: this.volumeRows,
          logisticsRows: this.logisticsRows,
          bufferRows: this.bufferRows,
          capacityRows: this.capacityRows,
          savedAt: this.savedAt,
        });
      localStorage.setItem(revisionStorageKey(targetRevisionId), source);
      this.hydrated = false;
      this.hydrate(targetRevisionId);
    },
    switchRevision(revisionId: string) {
      if (revisionId === this.activeRevisionId) return;
      if (this.hydrated && this.isDirty) this.save();
      if (!localStorage.getItem(revisionStorageKey(revisionId))) {
        this.cloneRevision(this.activeRevisionId, revisionId);
        return;
      }
      this.hydrated = false;
      this.hydrate(revisionId);
    },
    addVolume() {
      this.volumeRows.push({ id: createId("vol"), customer: "Novo cliente", model: "Novo modelo", vehiclesPerDay: 0, reinforcementPercent: 0, workingDays: 250, shifts: 2, averageLengthMm: 0, widthMm: 0, thicknessMm: 0, densityKgDm3: 7.85, coilCount: 0, coilWeightKg: 7000, status: "active" });
    },
    duplicateVolume(id: string) {
      const source = this.volumeRows.find((row) => row.id === id);
      if (source) this.volumeRows.push({ ...structuredClone(source), id: createId("vol"), customer: `${source.customer} — cópia` });
    },
    addLogistics() {
      this.logisticsRows.push({ id: createId("log"), customer: "Novo cliente", vehicle: "", flatbed: "", plannedDate: "", shipDate: "", plannedTime: "", transportHours: 0, beneficiatorDays: 0, movementMinutes: 5, shipmentFrequency: "", shipmentLotSize: 0, material: "Aguardando MES", item: "Aguardando MES", location: "Aguardando MES", orderedQuantity: null, finishedQuantity: null, mesOrigin: "ORACLE_MES", status: "active" });
    },
    duplicateLogistics(id: string) {
      const source = this.logisticsRows.find((row) => row.id === id);
      if (source) this.logisticsRows.push({ ...structuredClone(source), id: createId("log"), flatbed: "" });
    },
    addBuffer() {
      this.bufferRows.push({ id: createId("buf"), customer: "Novo cliente", point: "Novo ponto", direction: "entrada", type: "processo", quantityPieces: 0, capacityPieces: 0, pairsPerDay: 0, inputProcess: "", outputProcess: "", origin: "INPUT", status: "active" });
    },
    duplicateBuffer(id: string) {
      const source = this.bufferRows.find((row) => row.id === id);
      if (source) this.bufferRows.push({ ...structuredClone(source), id: createId("buf"), point: `${source.point} — cópia`, origin: "INPUT" });
    },
    addCapacity() {
      const next = this.capacityRows.length + 1;
      this.capacityRows.push({ id: createId("cap"), sequence: next, processCode: `P-${String(next).padStart(3, "0")}`, process: "Novo processo", cycleTimeMode: "manual", cycleTimeSeconds: 0, nominalCapacityPerHour: 0, referenceCapacityPerDay: null, shifts: 2, availableHoursPerDay: 16, efficiencyPercent: 100, targetWipPieces: 0, speedUnit: "peças/h", status: "active" });
    },
    duplicateCapacity(id: string) {
      const source = this.capacityRows.find((row) => row.id === id);
      if (source) this.capacityRows.push({ ...structuredClone(source), id: createId("cap"), sequence: this.capacityRows.length + 1, processCode: `${source.processCode}-C`, process: `${source.process} — cópia`, referenceCapacityPerDay: null });
    },
    toggleStatus(row: { status: RowStatus }) {
      row.status = row.status === "active" ? "inactive" : "active";
    },
  },
});
