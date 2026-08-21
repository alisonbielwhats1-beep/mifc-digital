import { defineStore } from "pinia";
import snapshotJson from "@/data/pbip-layout.json";
import { clamp } from "@/domain/layout-graph";

export type PbipVisualType = "shape" | "image" | "card" | "textbox";
export interface PbipLayoutVisual {
  id: string; type: PbipVisualType; x: number; y: number; width: number; height: number; z: number;
  asset?: string; shape?: string; angle?: number; weight?: number; text?: string; fontSize?: number;
  fontWeight?: number; color?: string; align?: string; measure?: string; value?: string; lane?: string; stale?: boolean;
}
interface PbipSnapshot { schemaVersion: number; source: string; width: number; height: number; counts: Record<PbipVisualType, number>; visuals: PbipLayoutVisual[] }
interface PersistedState { schemaVersion: 1; activeRevisionId: string; revisions: Record<string, PbipLayoutVisual[]> }

const sourceSnapshot = snapshotJson as PbipSnapshot;
const storageKey = "mifc-digital:prompt-6:pbip-layout-visuals";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const makeId = () => `pbip-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const usePbipLayoutStore = defineStore("pbip-layout", {
  state: () => ({
    visuals: clone(sourceSnapshot.visuals), selectedVisualId: null as string | null, activeRevisionId: "layout-rev-04",
    revisions: {} as Record<string, PbipLayoutVisual[]>, undoStack: [] as PbipLayoutVisual[][], redoStack: [] as PbipLayoutVisual[][],
    persistedVisuals: "", hydrated: false,
  }),
  getters: {
    width: () => sourceSnapshot.width,
    height: () => sourceSnapshot.height,
    source: () => sourceSnapshot.source,
    counts: () => sourceSnapshot.counts,
    selectedVisual(state): PbipLayoutVisual | undefined { return state.visuals.find((item) => item.id === state.selectedVisualId); },
    isDirty(state): boolean { return state.hydrated && JSON.stringify(state.visuals) !== state.persistedVisuals; },
  },
  actions: {
    hydrate(revisionId: string) {
      if (!this.hydrated) {
        try {
          const raw = localStorage.getItem(storageKey); const parsed = raw ? JSON.parse(raw) as Partial<PersistedState> : null;
          if (parsed?.schemaVersion === 1 && parsed.revisions && typeof parsed.revisions === "object") this.revisions = parsed.revisions;
        } catch { /* Usa novamente o snapshot somente leitura extraído do PBIP. */ }
        this.hydrated = true;
      }
      this.activeRevisionId = revisionId; this.visuals = clone(this.revisions[revisionId] ?? sourceSnapshot.visuals);
      this.selectedVisualId = null; this.undoStack = []; this.redoStack = []; this.persistedVisuals = JSON.stringify(this.visuals);
    },
    beginMutation() { this.undoStack.push(clone(this.visuals)); if (this.undoStack.length > 50) this.undoStack.shift(); this.redoStack = []; },
    undo() { const previous = this.undoStack.pop(); if (!previous) return; this.redoStack.push(clone(this.visuals)); this.visuals = previous; this.selectedVisualId = null; },
    redo() { const next = this.redoStack.pop(); if (!next) return; this.undoStack.push(clone(this.visuals)); this.visuals = next; this.selectedVisualId = null; },
    selectVisual(id: string | null) { this.selectedVisualId = id; },
    moveVisual(id: string, x: number, y: number) { const item = this.visuals.find((visual) => visual.id === id); if (item) { item.x = clamp(x, 0, sourceSnapshot.width - item.width); item.y = clamp(y, 0, sourceSnapshot.height - item.height); } },
    resizeVisual(id: string, width: number, height: number) { const item = this.visuals.find((visual) => visual.id === id); if (item) { item.width = clamp(width, 20, sourceSnapshot.width); item.height = clamp(height, 12, sourceSnapshot.height); } },
    updateSelected(patch: Partial<PbipLayoutVisual>) { const item = this.selectedVisual; if (!item) return; this.beginMutation(); Object.assign(item, clone(patch)); },
    duplicateSelected() { const source = this.selectedVisual; if (!source) return; this.beginMutation(); const copy = { ...clone(source), id: makeId(), x: source.x + 40, y: source.y + 40, z: Math.max(...this.visuals.map((item) => item.z)) + 1000 }; this.visuals.push(copy); this.selectedVisualId = copy.id; },
    deleteSelected() { if (!this.selectedVisualId) return; this.beginMutation(); this.visuals = this.visuals.filter((item) => item.id !== this.selectedVisualId); this.selectedVisualId = null; },
    save() { this.revisions[this.activeRevisionId] = clone(this.visuals); const payload: PersistedState = { schemaVersion: 1, activeRevisionId: this.activeRevisionId, revisions: this.revisions }; localStorage.setItem(storageKey, JSON.stringify(payload)); this.persistedVisuals = JSON.stringify(this.visuals); },
    switchRevision(revisionId: string) { if (revisionId === this.activeRevisionId) return; if (this.isDirty) this.save(); this.hydrate(revisionId); },
    cloneRevision(revisionId: string) { this.save(); this.activeRevisionId = revisionId; this.visuals = clone(this.visuals); this.revisions[revisionId] = clone(this.visuals); this.selectedVisualId = null; this.undoStack = []; this.redoStack = []; this.save(); },
  },
});
