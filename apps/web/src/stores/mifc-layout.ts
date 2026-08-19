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
interface PersistedLayout { schemaVersion: 4; activeRevisionId: string; revisions: LayoutRevision[] }

export const LAYOUT_WORLD_WIDTH = 1940;
export const LAYOUT_WORLD_HEIGHT = 820;

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
    node(r,"node-cut","process","LCT / RF2",278,365,108,74,properties("P-005",0,0,0,2,90,"LCT para Volvo FH; RF2 segue os dois MPs definidos no PBIP.","T-LCT/RF2"),"cap-lct"),
    node(r,"node-stamp","process","Roll Former 3",430,365,108,74,properties("P-001",48,68,1200,2,85,"Etapa identificada no PBIP.","T-RF3"),"cap-rf3"),
    node(r,"node-weld-1","process","Mesa 3",582,365,108,74,properties("P-003",0,0,0,2,90,"T-M3 é placeholder zero no PBIP; validar operacionalmente.","T-M3")),
    node(r,"node-weld-2","process","Beatty 1",734,325,108,64,properties("P-002-B1",62,132,928,2,82,"Volvo VM conforme o PBIP.","T-B1"),"cap-beatty"),
    node(r,"node-beatty-2","process","Beatty 2",734,405,108,64,properties("P-002-B2",62,132,928,2,82,"DAF conforme o PBIP.","T-B2"),"cap-beatty-2"),
    node(r,"node-beatty-3","process","Beatty 3",854,325,108,64,properties("P-002-B3",62,132,928,2,82,"Scania conforme o PBIP.","T-B3"),"cap-beatty-3"),
    node(r,"node-beatty-4","process","Beatty 4",854,405,108,64,properties("P-002-B4",62,132,928,2,82,"Volvo FH conforme o PBIP.","T-B4"),"cap-beatty-4"),
    node(r,"node-weld-3","process","P.A / CNC",1046,365,108,74,properties("P-006/007",0,0,0,2,90,"P.A para FH/Scania; CNC para VM/DAF.","T-P.A/T-CNC")),
    node(r,"node-assembly","process","Pintura / Rebitagem",1198,365,108,74,properties("P-003",110,150,528,2,60,"Pintura comum; rebitagem adicional para Scania e DAF.","T-LPP2"),"cap-paint"),
    node(r,"node-inspection","process","Stenhoj / Embalagem",1350,365,108,74,properties("P-004",60,110,960,2,90,"VM termina em embalagem; demais clientes usam Stenhoj e embalagem.","T-STJ/T-EMB-VM"),"cap-stenhoj"),
    node(r,"node-finished","storage","Armazém\nProduto acabado",1492,365,106,78,properties("BUF-002",0,100,720,2,95,"","D-E-PA")),
    node(r,"node-shipping","truck","Expedição",1620,370,86,68,properties("LOG-001")),
    node(r,"node-volvo","customer_supplier","VOLVO",1740,305,82,54,properties("CLI-001")),
    node(r,"node-scania","customer_supplier","SCANIA",1740,375,82,54,properties("CLI-002")),
    node(r,"node-daf","customer_supplier","DAF",1740,445,82,54,properties("CLI-003")),
    node(r,"node-renault","customer_supplier","RENAULT",1740,515,82,54,properties("CLI-004")),
    node(r,"node-toolroom","information","Ferramentaria",470,515,124,58,properties("SUP-001")),
    node(r,"node-maintenance","information","Manutenção",630,515,124,58,properties("SUP-002")),
    node(r,"node-lab","information","Laboratório",790,515,124,58,properties("SUP-003")),
    node(r,"node-quality-control","information","Controle de\nQualidade",950,515,136,58,properties("SUP-004")),
  ];
  const edges: LayoutEdge[] = [];
  const add = (id: string, source: string, target: string, flow: MifcFlowType, curve = 0) => edges.push(edge(r,id,source,target,flow,curve));
  add("mat-01","node-usiminas","node-raw","material_push",-30); add("mat-02","node-csn","node-raw","material_push",0); add("mat-03","node-gerdau","node-raw","material_push",30);
  add("mat-04","node-raw","node-cut","material_push"); add("mat-05","node-cut","node-stamp","material_push"); add("mat-06","node-stamp","node-weld-1","material_push");
  ["node-weld-2","node-beatty-2","node-beatty-3","node-beatty-4"].forEach((target,index) => add(`mat-07-${index+1}`,"node-weld-1",target,"material_push",(index-1.5)*18));
  ["node-weld-2","node-beatty-2","node-beatty-3","node-beatty-4"].forEach((source,index) => add(`mat-08-${index+1}`,source,"node-weld-3","material_push",(index-1.5)*18));
  add("mat-09","node-weld-3","node-assembly","material_push"); add("mat-10","node-assembly","node-inspection","material_push"); add("mat-11","node-inspection","node-finished","material_push"); add("mat-12","node-finished","node-shipping","material_push");
  add("mat-13","node-shipping","node-volvo","material_push",-25); add("mat-14","node-shipping","node-scania","material_push",-8); add("mat-15","node-shipping","node-daf","material_push",12); add("mat-16","node-shipping","node-renault","material_push",30);
  add("inf-01","node-erp","node-mrp","electronic_information",-18); add("inf-02","node-erp","node-planning","electronic_information",-8); add("inf-03","node-erp","node-quality-info","electronic_information",8); add("inf-04","node-erp","node-maint-info","electronic_information",18);
  add("inf-05","node-mrp","node-logistics","information",0); add("inf-06","node-quality-info","node-purchasing","information",0); add("inf-07","node-planning","node-edi","information",-18); add("inf-08","node-logistics","node-edi","information",15); add("inf-09","node-purchasing","node-edi","information",-15);
  ["node-cut","node-stamp","node-weld-1","node-weld-2","node-beatty-2","node-beatty-3","node-beatty-4","node-weld-3","node-assembly","node-inspection"].forEach((target,index) => add(`edi-${index+1}`,"node-edi",target,"electronic_information",(index-4.5)*14));
  add("sup-01","node-toolroom","node-stamp","information",-70); add("sup-02","node-maintenance","node-weld-2","information",-65); add("sup-03","node-lab","node-weld-3","information",-70); add("sup-04","node-quality-control","node-inspection","information",-60);
  add("sup-05","node-cut","node-toolroom","information",75); add("sup-06","node-weld-1","node-maintenance","information",65); add("sup-07","node-weld-2","node-lab","information",75); add("sup-08","node-assembly","node-quality-control","information",65);
  add("ext-01","node-volvo","node-erp","electronic_information",-155); add("ext-02","node-scania","node-erp","electronic_information",-125); add("ext-03","node-daf","node-erp","electronic_information",-95); add("ext-04","node-renault","node-erp","electronic_information",-65);
  add("ext-05","node-usiminas","node-erp","information",-115); add("ext-06","node-csn","node-erp","information",-80); add("ext-07","node-gerdau","node-erp","information",-45);
  return { id: r, number: 4, label: "Rev. 04 (Atual)", createdAt: now, nodes, edges };
}

function graphSnapshot(revision: LayoutRevision): GraphSnapshot { return { nodes: clone(revision.nodes), edges: clone(revision.edges) }; }

const legacyProcessLabels: Record<string, string> = {
  "node-cut": "Corte",
  "node-stamp": "Estamparia",
  "node-weld-1": "Solda 1",
  "node-weld-2": "Solda 2",
  "node-weld-3": "Solda 3",
  "node-assembly": "Montagem",
  "node-inspection": "Inspeção",
};

function migrateLegacyProcessLabels(revisions: LayoutRevision[]): LayoutRevision[] {
  const baseline = new Map(initialRevision().nodes.map((item) => [item.id, item]));
  for (const revision of revisions) {
    for (const item of revision.nodes) {
      const baselineId = Object.keys(legacyProcessLabels).find((id) => item.id === id || item.id.endsWith(`-${id}`));
      if (!baselineId || item.label !== legacyProcessLabels[baselineId]) continue;
      const replacement = baseline.get(baselineId);
      if (!replacement) continue;
      item.label = replacement.label;
      item.processId = replacement.processId;
      item.properties = clone(replacement.properties);
      item.validationStatus = replacement.validationStatus;
    }
  }
  return revisions;
}

function migrateBeattyLayout(revisions: LayoutRevision[]): LayoutRevision[] {
  for (const revision of revisions) {
    const find = (suffix: string) => revision.nodes.find((item) => item.id === suffix || item.id.endsWith(`-${suffix}`));
    const beatty1 = find("node-weld-2");
    const mesa3 = find("node-weld-1");
    const nextProcess = find("node-weld-3");
    const edi = find("node-edi");
    if (!beatty1 || !mesa3 || !nextProcess) continue;
    if (find("node-beatty-2")) continue;

    for (const item of revision.nodes) {
      if (item.x > beatty1.x && item.y >= 280) item.x += 160;
    }
    beatty1.y -= 40;
    if (["Beattys", "Solda 2"].includes(beatty1.label)) beatty1.label = "Beatty 1";
    beatty1.processId = "cap-beatty";
    beatty1.properties = properties("P-002-B1",62,132,928,2,82,"Volvo VM conforme o PBIP.","T-B1");
    const prefix = beatty1.id.slice(0, -"node-weld-2".length);
    const makeBeatty = (machine: 2 | 3 | 4, x: number, y: number): LayoutNode => ({
      ...clone(beatty1),
      id: `${prefix}node-beatty-${machine}`,
      label: `Beatty ${machine}`,
      x,
      y,
      processId: `cap-beatty-${machine}`,
      properties: properties(`P-002-B${machine}`,62,132,928,2,82,`${machine === 2 ? "DAF" : machine === 3 ? "Scania" : "Volvo FH"} conforme o PBIP.`,`T-B${machine}`),
    });
    const beatty2 = makeBeatty(2, beatty1.x, beatty1.y + 80);
    const beatty3 = makeBeatty(3, beatty1.x + 120, beatty1.y);
    const beatty4 = makeBeatty(4, beatty1.x + 120, beatty1.y + 80);
    revision.nodes.push(beatty2, beatty3, beatty4);

    revision.edges = revision.edges.filter((item) => !(
      item.flowType === "material_push"
      && ((item.sourceNodeId === mesa3.id && item.targetNodeId === beatty1.id)
        || (item.sourceNodeId === beatty1.id && item.targetNodeId === nextProcess.id))
    ));
    const beattys = [beatty1, beatty2, beatty3, beatty4];
    beattys.forEach((item, index) => {
      revision.edges.push(edge(revision.id,`${prefix}mat-07-${index+1}`,mesa3.id,item.id,"material_push",(index-1.5)*18));
      revision.edges.push(edge(revision.id,`${prefix}mat-08-${index+1}`,item.id,nextProcess.id,"material_push",(index-1.5)*18));
      if (edi && index > 0) revision.edges.push(edge(revision.id,`${prefix}edi-beatty-${index+1}`,edi.id,item.id,"electronic_information",(index-1.5)*14));
    });
  }
  return revisions;
}

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
      try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) as { schemaVersion?: number; activeRevisionId?: string; revisions?: LayoutRevision[] } : null;
        if ([2,3,4].includes(parsed?.schemaVersion ?? 0) && Array.isArray(parsed?.revisions) && parsed.revisions.length && typeof parsed.activeRevisionId === "string") {
          const labeled = parsed.schemaVersion === 2 ? migrateLegacyProcessLabels(parsed.revisions) : parsed.revisions;
          this.revisions = parsed.schemaVersion === 4 ? labeled : migrateBeattyLayout(labeled);
          this.activeRevisionId = parsed.activeRevisionId;
        }
      } catch { /* baseline local */ }
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
    moveNode(id: string, x: number, y: number) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (item) { item.x = clamp(x, 0, LAYOUT_WORLD_WIDTH - item.width); item.y = clamp(y, 0, 610 - item.height); } },
    resizeNode(id: string, width: number, height: number) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (item) { item.width = clamp(width, 62, 280); item.height = clamp(height, 38, 180); } },
    moveEdgeCurve(id: string, curveOffset: number) { const item = this.activeRevision.edges.find((entry) => entry.id === id); if (item) item.curveOffset = clamp(curveOffset, -320, 320); },
    previewNodeLabel(id: string, label: string) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (item) item.label = label; },
    commitNodeLabel(id: string, previousLabel: string, label: string) {
      const item = this.activeRevision.nodes.find((entry) => entry.id === id);
      const nextLabel = label.trim();
      if (!item || !nextLabel) { if (item) item.label = previousLabel; return; }
      if (previousLabel === nextLabel) { item.label = nextLabel; return; }
      item.label = previousLabel;
      this.beginMutation();
      item.label = nextLabel;
    },
    cancelNodeLabel(id: string, previousLabel: string) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (item) item.label = previousLabel; },
    updateNode(id: string, patch: Partial<Omit<LayoutNode, "id" | "revisionId">>) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (!item) return; this.beginMutation(); Object.assign(item, clone(patch)); },
    applyNode(id: string, label: string, nodeProperties: LayoutNodeProperties, processId?: string) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (!item) return; this.beginMutation(); item.label = label; item.properties = clone(nodeProperties); item.processId = processId; item.validationStatus = processId ? "mapped" : item.validationStatus; },
    addNode(type: LayoutNodeType, x = 720, y = 330) { this.beginMutation(); const id = makeId("node"); const count = this.activeRevision.nodes.filter((item) => item.type === type).length + 1; const labels: Record<LayoutNodeType,string> = { process:"Novo processo", storage:"Armazenamento", stagnation:"Estagnação", database:"Base de dados", customer_supplier:"Cliente / fornecedor", truck:"Caminhão", kanban:"Kanban", information:"Informação", text:"Texto" }; this.activeRevision.nodes.push(node(this.activeRevision.id,id,type,labels[type],x,y,type === "process" ? 108 : 96,type === "process" ? 74 : 58,properties(`${type.slice(0,3).toUpperCase()}-${String(count).padStart(3,"0")}`))); this.selectNode(id); this.activeTool = "select"; },
    duplicateSelected() { const source = this.selectedNode; if (!source) return; this.beginMutation(); const copy = clone(source); copy.id = makeId("node"); copy.label = `${source.label} — cópia`; copy.x += 28; copy.y += 28; copy.processId = undefined; copy.validationStatus = "pending"; this.activeRevision.nodes.push(copy); this.selectNode(copy.id); },
    deleteSelected() { if (!this.selectedNodeId && !this.selectedEdgeId) return; this.beginMutation(); if (this.selectedNodeId) { const id = this.selectedNodeId; this.activeRevision.nodes = this.activeRevision.nodes.filter((item) => item.id !== id); this.activeRevision.edges = this.activeRevision.edges.filter((item) => item.sourceNodeId !== id && item.targetNodeId !== id); } else this.activeRevision.edges = this.activeRevision.edges.filter((item) => item.id !== this.selectedEdgeId); this.selectedNodeId = null; this.selectedEdgeId = null; },
    connectNode(id: string, flowType: MifcFlowType = "material_push") { if (!this.connectSourceId) { this.connectSourceId = id; return; } if (canConnect(this.activeRevision.edges,this.connectSourceId,id,flowType)) { this.beginMutation(); this.activeRevision.edges.push(edge(this.activeRevision.id,makeId("edge"),this.connectSourceId,id,flowType,0)); } this.connectSourceId = null; this.activeTool = "select"; },
    updateSelectedEdge(patch: Partial<Pick<LayoutEdge,"flowType"|"sourceNodeId"|"targetNodeId"|"curveOffset">>) { const item = this.selectedEdge; if (!item) return; this.beginMutation(); Object.assign(item,clone(patch)); },
    save() { this.activeRevision.savedAt = new Date().toISOString(); const payload: PersistedLayout = { schemaVersion: 4, activeRevisionId: this.activeRevisionId, revisions: this.revisions }; localStorage.setItem(storageKey,JSON.stringify(payload)); this.persistedGraph = JSON.stringify(graphSnapshot(this.activeRevision)); },
    switchRevision(id: string) { const revision = this.revisions.find((item) => item.id === id); if (!revision || id === this.activeRevisionId) return; if (this.isDirty) this.save(); this.activeRevisionId = id; this.selectedNodeId = revision.nodes[0]?.id ?? null; this.selectedEdgeId = null; this.undoStack = []; this.redoStack = []; this.persistedGraph = JSON.stringify(graphSnapshot(revision)); this.save(); },
    createRevision() { this.save(); const number = Math.max(...this.revisions.map((item) => item.number)) + 1; const revisionId = makeId("layout-rev"); const source = this.activeRevision; const nodeIds = new Map(source.nodes.map((item) => [item.id,`${revisionId}-${item.id}`])); const revision: LayoutRevision = { id:revisionId, number, label:`Rev. ${String(number).padStart(2,"0")} (Rascunho)`, createdAt:new Date().toISOString(), nodes:source.nodes.map((item) => ({...clone(item),id:nodeIds.get(item.id)!,revisionId})), edges:source.edges.map((item) => ({...clone(item),id:makeId("edge"),revisionId,sourceNodeId:nodeIds.get(item.sourceNodeId)!,targetNodeId:nodeIds.get(item.targetNodeId)!})) }; this.revisions.push(revision); this.activeRevisionId = revisionId; this.undoStack = []; this.redoStack = []; this.selectedNodeId = revision.nodes[0]?.id ?? null; this.selectedEdgeId = null; this.persistedGraph = JSON.stringify(graphSnapshot(revision)); this.save(); },
  },
});
