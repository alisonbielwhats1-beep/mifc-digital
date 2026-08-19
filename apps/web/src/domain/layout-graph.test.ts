import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { canConnect, clamp, edgeGeometry, edgePath } from "./layout-graph";
import { useMifcLayoutStore } from "@/stores/mifc-layout";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

beforeEach(() => {
  setActivePinia(createPinia());
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new MemoryStorage() });
});

describe("geometria do grafo MIFC", () => {
  it("limita posições e cria uma curva entre os centros laterais", () => {
    expect(clamp(120, 0, 100)).toBe(100);
    const source = { id: "a", x: 10, y: 20, width: 100, height: 60 }; const target = { id: "b", x: 250, y: 40, width: 100, height: 60 };
    expect(edgePath(source,target,40)).toMatch(/^M 110 50 Q/);
    expect(edgeGeometry(source,target,40).control.y).toBe(100);
  });

  it("impede autorreferência e conexão duplicada", () => {
    const edges = [{ sourceNodeId: "a", targetNodeId: "b", flowType: "material_push" as const }];
    expect(canConnect(edges, "a", "a", "material_push")).toBe(false);
    expect(canConnect(edges, "a", "b", "material_push")).toBe(false);
    expect(canConnect(edges, "a", "b", "information")).toBe(true);
  });
});

describe("histórico e revisões do Layout", () => {
  it("inicia com o diagrama da referência e duplica blocos", () => {
    const store = useMifcLayoutStore(); store.hydrate();
    expect(store.activeRevision.nodes).toHaveLength(29);
    expect(store.activeRevision.edges).toHaveLength(47);
    store.selectNode("node-weld-2"); store.duplicateSelected(); expect(store.activeRevision.nodes).toHaveLength(30);
    expect(store.activeRevision.nodes.at(-1)?.processId).toBeUndefined();
    store.undo(); expect(store.activeRevision.nodes).toHaveLength(29);
    store.redo(); expect(store.activeRevision.nodes).toHaveLength(30);
  });

  it("salva o grafo e cria uma nova revisão independente", () => {
    const store = useMifcLayoutStore(); store.hydrate(); store.createRevision();
    expect(store.revisions).toHaveLength(2);
    expect(store.activeRevision.number).toBe(5);
    expect(store.activeRevision.nodes.every((node) => node.revisionId === store.activeRevision.id)).toBe(true);
    expect(localStorage.getItem("mifc-digital:layout-reference-v2")).toContain('"schemaVersion":2');
  });

  it("move, redimensiona e conecta elementos com limites do canvas", () => {
    const store = useMifcLayoutStore(); store.hydrate();
    store.addNode("process"); const firstId = store.selectedNodeId!;
    store.addNode("process"); const secondId = store.selectedNodeId!;
    store.beginMutation(); store.moveNode(firstId, -500, 3000); store.resizeNode(firstId, 20, 900);
    const moved = store.activeRevision.nodes.find((node) => node.id === firstId)!;
    expect({ x: moved.x, y: moved.y, width: moved.width, height: moved.height }).toEqual({ x: 0, y: 536, width: 62, height: 180 });
    store.connectNode(firstId, "electronic_information"); store.connectNode(secondId, "electronic_information");
    expect(store.activeRevision.edges).toHaveLength(48);
    store.undo(); expect(store.activeRevision.edges).toHaveLength(47);
  });

  it("edita a curvatura e as pontas de uma linha", () => {
    const store = useMifcLayoutStore(); store.hydrate(); store.selectEdge("inf-01");
    store.updateSelectedEdge({ curveOffset: 120, targetNodeId: "node-logistics" });
    expect(store.selectedEdge).toMatchObject({ curveOffset: 120, targetNodeId: "node-logistics" });
    store.undo(); expect(store.selectedEdge).toBeUndefined();
    expect(store.activeRevision.edges.find((edge) => edge.id === "inf-01")).toMatchObject({ curveOffset: -18, targetNodeId: "node-mrp" });
  });
});
