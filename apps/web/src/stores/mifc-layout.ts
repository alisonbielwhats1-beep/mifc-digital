import type { MifcFlowType, ValidationStatus } from "@mifc/domain";
import { defineStore } from "pinia";
import { canConnect, clamp } from "@/domain/layout-graph";

export type LayoutNodeType = "process" | "storage" | "stagnation" | "database" | "customer_supplier" | "truck" | "kanban" | "information" | "text";
export type LayoutTool = "select" | "connect" | "text" | "line" | "pan";

export interface LayoutNodeProperties {
  code: string; cycleTimeSeconds: number; wipPieces: number; capacityPerDay: number; shifts: number;
  availabilityPercent: number; notes: string; calculationKey: string;
}
export interface LayoutNode {
  id: string; revisionId: string; type: LayoutNodeType; processId?: string; label: string; x: number; y: number;
  width: number; height: number; layer: number; properties: LayoutNodeProperties; sourceVisualIds: string[]; validationStatus: ValidationStatus;
}
export interface LayoutEdge {
  id: string; revisionId: string; sourceNodeId: string; targetNodeId: string; flowType: MifcFlowType;
  curveOffset: number; validationStatus: ValidationStatus;
}
export interface LayoutRevision { id: string; number: number; label: string; createdAt: string; savedAt?: string; nodes: LayoutNode[]; edges: LayoutEdge[] }
interface GraphSnapshot { nodes: LayoutNode[]; edges: LayoutEdge[] }
interface PersistedLayout { schemaVersion: 2; activeRevisionId: string; revisions: LayoutRevision[] }

const storageKey = "mifc-digital:layout-reference-v2";
const now = "2026-08-19T12:00:00.000Z";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function properties(code: string, cycleTimeSeconds = 0, wipPieces = 0, capacityPerDay = 0, shifts = 2, availabilityPercent = 90, notes = "", calculationKey = ""): LayoutNodeProperties {
  return { code, cycleTimeSeconds, wipPieces, capacityPerDay, shifts, availabilityPercent, notes, calculationKey };
}
function node(revisionId: string, id: string, type: LayoutNodeType, label: string, x: number, y: number, width: number, height: number, props = properties(""), processId?: string): LayoutNode {
  return { id, revisionId, type, processId, label, x, y, width, height, layer: 10, properties: props, sourceVisualIds: [], validationStatus: processId ? "mapped" : "pending" };
}
function edge(revisionId: string, id: string, sourceNodeId: string, targetNodeId: string, flowType: MifcFlowType, curveOffset = 0): LayoutEdge {
  return { id, revisionId, sourceNodeId, targetNodeId, flowType, curveOffset, validationStatus: "mapped" };
}

function initialRevision(): LayoutRevision {
  const r = "layout-rev-04";
  const nodes = [
    node(r,"node-erp","database","ERP / SAP",725,22,94,52,properties("INF-001")),
    node(r,"node-mrp","database","MRP",545,105,92,48,properties("INF-002")),
    node(r,"node-planning","database","Planejamento",665,105,106,48,properties("INF-003")),
    node(r,"node-quality-info","database","Qualidade",795,105,96,48,properties("INF-004")),
    node(r,"node-maint-info","database","Manutenção",915,105,104,48,properties("INF-005")),
    node(r,"node-logistics","database","Logística",603,180,92,46,properties("INF-006")),
    node(r,"node-purchasing","database","Compras",812,180,92,46,properties("INF-007")),
    node(r,"node-edi","information","EDI",724,238,94,48,properties("INF-008")),
    node(r,"node-usiminas","customer_supplier","USIMINAS",18,318,82,54,properties("EXT-001")),
    node(r,"node-csn","customer_supplier","CSN",18,390,82,54,properties("EXT-002")),
    node(r,"node-gerdau","customer_supplier","GERDAU",18,462,82,54,properties("EXT-003")),
    node(r,"node-raw","storage","Almox.\nMatéria-prima",130,365,104,78,properties("BUF-001",0,250,100,2,95,"Estoque de matéria-prima.","D-E-MP")),
    node(r,"node-cut","process","Corte",278,365,108,74,properties("P-001",48,1,1440,2,92,"","T-C-CORTE"),"cap-rf3"),
    node(r,"node-stamp","process","Estamparia",430,365,108,74,properties("P-002",75,1,960,2,90,"","T-C-ESTAMP")),
    node(r,"node-weld-1","process","Solda 1",582,365,108,74,properties("P-003",120,1,720,2,88,"","T-C-S1")),
    node(r,"node-weld-2","process","Solda 2",734,365,108,74,properties("P-005",110,1,720,2,90,"Solda robotizada.\nTempo inclui setup.","T-C-S2")),
    node(r,"node-weld-3","process","Solda 3",886,365,108,74,properties("P-006",110,1,720,2,90,"","T-C-S3")),
    node(r,"node-assembly","process","Montagem",1038,365,108,74,properties("P-007",85,1,840,2,92,"","T-C-MONT")),
    node(r,"node-inspection","process","Inspeção",1190,365,108,74,properties("P-008",60,1,1200,2,95,"","T-C-INSP")),
    node(r,"node-finished","storage","Armazém\nProduto acabado",1332,365,106,78,properties("BUF-002",0,100,720,2,95,"","D-E-PA")),
    node(r,"node-shipping","truck","Expedição",1460,370,86,68,properties("LOG-001")),
    node(r,"node-volvo","customer_supplier","VOLVO",1580,305,82,54,properties("CLI-001")),
    node(r,"node-scania","customer_supplier","SCANIA",1580,375,82,54,properties("CLI-002")),
    node(r,"node-daf","customer_supplier","DAF",1580,445,82,54,properties("CLI-003")),
    node(r,"node-renault","customer_supplier","RENAULT",1580,515,82,54,properties("CLI-004")),
    node(r,"node-toolroom","information","Ferramentaria",470,515,124,58,properties("SUP-001")),
    node(r,"node-maintenance","information","Manutenção",630,515,124,58,properties("SUP-002")),
    node(r,"node-lab","information","Laboratório",790,515,124,58,properties("SUP-003")),
    node(r,"node-quality-control","information","Controle de\nQualidade",950,515,136,58,properties("SUP-004")),
  ];
  const edges: LayoutEdge[] = [];
  const add = (id: string, source: string, target: string, flow: MifcFlowType, curve = 0) => edges.push(edge(r,id,source,target,flow,curve));
  add("mat-01","node-usiminas","node-raw","material_push",-30); add("mat-02","node-csn","node-raw","material_push",0); add("mat-03","node-gerdau","node-raw","material_push",30);
  add("mat-04","node-raw","node-cut","material_push"); add("mat-05","node-cut","node-stamp","material_push"); add("mat-06","node-stamp","node-weld-1","material_push"); add("mat-07","node-weld-1","node-weld-2","material_push"); add("mat-08","node-weld-2","node-weld-3","material_push"); add("mat-09","node-weld-3","node-assembly","material_push"); add("mat-10","node-assembly","node-inspection","material_push"); add("mat-11","node-inspection","node-finished","material_push"); add("mat-12","node-finished","node-shipping","material_push");
  add("mat-13","node-shipping","node-volvo","material_push",-25); add("mat-14","node-shipping","node-scania","material_push",-8); add("mat-15","node-shipping","node-daf","material_push",12); add("mat-16","node-shipping","node-renault","material_push",30);
  add("inf-01","node-erp","node-mrp","electronic_information",-18); add("inf-02","node-erp","node-planning","electronic_information",-8); add("inf-03","node-erp","node-quality-info","electronic_information",8); add("inf-04","node-erp","node-maint-info","electronic_information",18);
  add("inf-05","node-mrp","node-logistics","information",0); add("inf-06","node-quality-info","node-purchasing","information",0); add("inf-07","node-planning","node-edi","information",-18); add("inf-08","node-logistics","node-edi","information",15); add("inf-09","node-purchasing","node-edi","information",-15);
  ["node-cut","node-stamp","node-weld-1","node-weld-2","node-weld-3","node-assembly","node-inspection"].forEach((target,index) => add(`edi-${index+1}`,"node-edi",target,"electronic_information",(index-3)*18));
  add("sup-01","node-toolroom","node-stamp","information",-70); add("sup-02","node-maintenance","node-weld-2","information",-65); add("sup-03","node-lab","node-weld-3","information",-70); add("sup-04","node-quality-control","node-inspection","information",-60);
  add("sup-05","node-cut","node-toolroom","information",75); add("sup-06","node-weld-1","node-maintenance","information",65); add("sup-07","node-weld-2","node-lab","information",75); add("sup-08","node-assembly","node-quality-control","information",65);
  add("ext-01","node-volvo","node-erp","electronic_information",-155); add("ext-02","node-scania","node-erp","electronic_information",-125); add("ext-03","node-daf","node-erp","electronic_information",-95); add("ext-04","node-renault","node-erp","electronic_information",-65);
  add("ext-05","node-usiminas","node-erp","information",-115); add("ext-06","node-csn","node-erp","information",-80); add("ext-07","node-gerdau","node-erp","information",-45);
  return { id: r, number: 4, label: "Rev. 04 (Atual)", createdAt: now, nodes, edges };
}

function graphSnapshot(revision: LayoutRevision): GraphSnapshot { return { nodes: clone(revision.nodes), edges: clone(revision.edges) }; }

export const useMifcLayoutStore = defineStore("mifc-layout", {
  state: () => ({ revisions: [initialRevision()] as LayoutRevision[], activeRevisionId: "layout-rev-04", selectedNodeId: "node-weld-2" as string | null, selectedEdgeId: null as string | null, connectSourceId: null as string | null, activeTool: "select" as LayoutTool, undoStack: [] as GraphSnapshot[], redoStack: [] as GraphSnapshot[], hydrated: false, persistedGraph: "" }),
  getters: {
    activeRevision(state): LayoutRevision { return state.revisions.find((item) => item.id === state.activeRevisionId) ?? state.revisions[0]; },
    selectedNode(): LayoutNode | undefined { return this.activeRevision.nodes.find((item) => item.id === this.selectedNodeId); },
    selectedEdge(): LayoutEdge | undefined { return this.activeRevision.edges.find((item) => item.id === this.selectedEdgeId); },
    isDirty(): boolean { return this.hydrated && JSON.stringify(graphSnapshot(this.activeRevision)) !== this.persistedGraph; },
  },
  actions: {
    hydrate() {
      if (this.hydrated) return;
      try { const raw = localStorage.getItem(storageKey); const parsed = raw ? JSON.parse(raw) as Partial<PersistedLayout> : null; if (parsed?.schemaVersion === 2 && Array.isArray(parsed.revisions) && parsed.revisions.length && typeof parsed.activeRevisionId === "string") { this.revisions = parsed.revisions; this.activeRevisionId = parsed.activeRevisionId; } } catch { /* baseline local */ }
      if (!this.activeRevision.nodes.some((item) => item.id === this.selectedNodeId)) this.selectedNodeId = this.activeRevision.nodes[0]?.id ?? null;
      this.persistedGraph = JSON.stringify(graphSnapshot(this.activeRevision)); this.hydrated = true;
    },
    beginMutation() { this.undoStack.push(graphSnapshot(this.activeRevision)); if (this.undoStack.length > 50) this.undoStack.shift(); this.redoStack = []; },
    restore(snapshot: GraphSnapshot) { this.activeRevision.nodes = clone(snapshot.nodes); this.activeRevision.edges = clone(snapshot.edges); this.selectedNodeId = null; this.selectedEdgeId = null; },
    undo() { const snapshot = this.undoStack.pop(); if (!snapshot) return; this.redoStack.push(graphSnapshot(this.activeRevision)); this.restore(snapshot); },
    redo() { const snapshot = this.redoStack.pop(); if (!snapshot) return; this.undoStack.push(graphSnapshot(this.activeRevision)); this.restore(snapshot); },
    selectNode(id: string | null) { this.selectedNodeId = id; this.selectedEdgeId = null; },
    selectEdge(id: string | null) { this.selectedEdgeId = id; this.selectedNodeId = null; },
    setTool(tool: LayoutTool) { this.activeTool = tool; this.connectSourceId = null; },
    moveNode(id: string, x: number, y: number) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (item) { item.x = clamp(x, 0, 1680 - item.width); item.y = clamp(y, 0, 610 - item.height); } },
    resizeNode(id: string, width: number, height: number) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (item) { item.width = clamp(width, 62, 280); item.height = clamp(height, 38, 180); } },
    moveEdgeCurve(id: string, curveOffset: number) { const item = this.activeRevision.edges.find((entry) => entry.id === id); if (item) item.curveOffset = clamp(curveOffset, -320, 320); },
    updateNode(id: string, patch: Partial<Omit<LayoutNode, "id" | "revisionId">>) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (!item) return; this.beginMutation(); Object.assign(item, clone(patch)); },
    applyNode(id: string, label: string, nodeProperties: LayoutNodeProperties, processId?: string) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (!item) return; this.beginMutation(); item.label = label; item.properties = clone(nodeProperties); item.processId = processId; item.validationStatus = processId ? "mapped" : item.validationStatus; },
    addNode(type: LayoutNodeType, x = 720, y = 330) { this.beginMutation(); const id = makeId("node"); const count = this.activeRevision.nodes.filter((item) => item.type === type).length + 1; const labels: Record<LayoutNodeType,string> = { process:"Novo processo", storage:"Armazenamento", stagnation:"Estagnação", database:"Base de dados", customer_supplier:"Cliente / fornecedor", truck:"Caminhão", kanban:"Kanban", information:"Informação", text:"Texto" }; this.activeRevision.nodes.push(node(this.activeRevision.id,id,type,labels[type],x,y,type === "process" ? 108 : 96,type === "process" ? 74 : 58,properties(`${type.slice(0,3).toUpperCase()}-${String(count).padStart(3,"0")}`))); this.selectNode(id); this.activeTool = "select"; },
    duplicateSelected() { const source = this.selectedNode; if (!source) return; this.beginMutation(); const copy = clone(source); copy.id = makeId("node"); copy.label = `${source.label} — cópia`; copy.x += 28; copy.y += 28; copy.processId = undefined; copy.validationStatus = "pending"; this.activeRevision.nodes.push(copy); this.selectNode(copy.id); },
    deleteSelected() { if (!this.selectedNodeId && !this.selectedEdgeId) return; this.beginMutation(); if (this.selectedNodeId) { const id = this.selectedNodeId; this.activeRevision.nodes = this.activeRevision.nodes.filter((item) => item.id !== id); this.activeRevision.edges = this.activeRevision.edges.filter((item) => item.sourceNodeId !== id && item.targetNodeId !== id); } else this.activeRevision.edges = this.activeRevision.edges.filter((item) => item.id !== this.selectedEdgeId); this.selectedNodeId = null; this.selectedEdgeId = null; },
    connectNode(id: string, flowType: MifcFlowType = "material_push") { if (!this.connectSourceId) { this.connectSourceId = id; return; } if (canConnect(this.activeRevision.edges,this.connectSourceId,id,flowType)) { this.beginMutation(); this.activeRevision.edges.push(edge(this.activeRevision.id,makeId("edge"),this.connectSourceId,id,flowType,0)); } this.connectSourceId = null; this.activeTool = "select"; },
    updateSelectedEdge(patch: Partial<Pick<LayoutEdge,"flowType"|"sourceNodeId"|"targetNodeId"|"curveOffset">>) { const item = this.selectedEdge; if (!item) return; this.beginMutation(); Object.assign(item,clone(patch)); },
    save() { this.activeRevision.savedAt = new Date().toISOString(); const payload: PersistedLayout = { schemaVersion: 2, activeRevisionId: this.activeRevisionId, revisions: this.revisions }; localStorage.setItem(storageKey,JSON.stringify(payload)); this.persistedGraph = JSON.stringify(graphSnapshot(this.activeRevision)); },
    switchRevision(id: string) { const revision = this.revisions.find((item) => item.id === id); if (!revision || id === this.activeRevisionId) return; if (this.isDirty) this.save(); this.activeRevisionId = id; this.selectedNodeId = revision.nodes[0]?.id ?? null; this.selectedEdgeId = null; this.undoStack = []; this.redoStack = []; this.persistedGraph = JSON.stringify(graphSnapshot(revision)); this.save(); },
    createRevision() { this.save(); const number = Math.max(...this.revisions.map((item) => item.number)) + 1; const revisionId = makeId("layout-rev"); const source = this.activeRevision; const nodeIds = new Map(source.nodes.map((item) => [item.id,`${revisionId}-${item.id}`])); const revision: LayoutRevision = { id:revisionId, number, label:`Rev. ${String(number).padStart(2,"0")} (Rascunho)`, createdAt:new Date().toISOString(), nodes:source.nodes.map((item) => ({...clone(item),id:nodeIds.get(item.id)!,revisionId})), edges:source.edges.map((item) => ({...clone(item),id:makeId("edge"),revisionId,sourceNodeId:nodeIds.get(item.sourceNodeId)!,targetNodeId:nodeIds.get(item.targetNodeId)!})) }; this.revisions.push(revision); this.activeRevisionId = revisionId; this.undoStack = []; this.redoStack = []; this.selectedNodeId = revision.nodes[0]?.id ?? null; this.selectedEdgeId = null; this.persistedGraph = JSON.stringify(graphSnapshot(revision)); this.save(); },
  },
});
