import type { MifcFlowType, ValidationStatus } from "@mifc/domain";
import { defineStore } from "pinia";
import type { CycleTimeMode } from "@/domain/cycle-time";
import { canConnect, clamp } from "@/domain/layout-graph";

export type LayoutNodeType = "process" | "storage" | "stagnation" | "database" | "customer_supplier" | "truck" | "kanban" | "information" | "text";
export type LayoutTool = "select" | "connect" | "text" | "line" | "pan";

export interface LayoutNodeProperties {
  code: string; cycleTimeSeconds: number; wipPieces: number; capacityPerDay: number; shifts: number;
  availabilityPercent: number; notes: string; calculationKey: string; cycleTimeMode?: CycleTimeMode;
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
interface PersistedLayout { schemaVersion: 8; activeRevisionId: string; revisions: LayoutRevision[] }

export const LAYOUT_WORLD_WIDTH = 3500;
export const LAYOUT_WORLD_HEIGHT = 1600;
export const LAYOUT_PROCESS_AREA_BOTTOM = 1262;

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
    node(r,"node-erp","database","ERP / SAP",1180,22,118,62,properties("INF-001")),
    node(r,"node-mrp","database","MRP",760,110,112,56,properties("INF-002")),
    node(r,"node-planning","database","Planejamento",990,110,132,56,properties("INF-003")),
    node(r,"node-quality-info","database","Qualidade",1220,110,116,56,properties("INF-004")),
    node(r,"node-maint-info","database","Manutenção",1450,110,124,56,properties("INF-005")),
    node(r,"node-logistics","database","Logística",900,205,112,54,properties("INF-006")),
    node(r,"node-purchasing","database","Compras",1320,205,112,54,properties("INF-007")),
    node(r,"node-edi","information","EDI",1120,295,112,56,properties("INF-008")),
    node(r,"node-usiminas","customer_supplier","USIMINAS",28,520,120,78,properties("EXT-001")),
    node(r,"node-csn","customer_supplier","CSN",28,650,120,78,properties("EXT-002")),
    node(r,"node-gerdau","customer_supplier","GERDAU",28,780,120,78,properties("EXT-003")),
    node(r,"node-beneficiator","customer_supplier","Beneficiador",205,585,150,110,properties("EXT-BEN",0,0,0,2,95,"Tempo manual por cliente no cadastro Logística.","T-B")),
    node(r,"node-raw","storage","Almox.\nMatéria-prima",420,585,150,110,properties("BUF-001",0,250,100,2,95,"Estoque de matéria-prima.","D-E-MP")),
    node(r,"node-cut","process","LCT",650,585,145,118,properties("P-005",0,0,0,2,90,"Máquina LCT. O PBIP mantém o tempo agregado LCT/RF2 na rota FH; a produção automática desta fonte ainda não está homologada.","T-LCT/RF2"),"cap-lct"),
    node(r,"node-rf2","process","Roll Former 2",650,760,145,118,properties("P-005-RF2",0,0,0,2,90,"Máquina independente. O estoque RF2 é separado no PBIP; a conversão do contador para peça ainda está pendente.",""),"cap-rf2"),
    node(r,"node-stamp","process","Roll Former 3",900,585,170,118,properties("P-001",48,68,1200,2,85,"Etapa identificada no PBIP.","T-RF3"),"cap-rf3"),
    node(r,"node-weld-1","process","Mesa 3",1150,585,170,118,properties("P-003",0,0,0,2,90,"T-M3 é placeholder zero no PBIP; validar operacionalmente.","T-M3")),
    node(r,"node-beatty-3","process","Beatty 3",1380,280,160,112,properties("P-002-B3",62,132,928,2,82,"Scania conforme o PBIP.","T-B3"),"cap-beatty-3"),
    node(r,"node-beatty-4","process","Beatty 4",1430,500,160,112,properties("P-002-B4",62,132,928,2,82,"Volvo FH conforme o PBIP.","T-B4"),"cap-beatty-4"),
    node(r,"node-beatty-2","process","Beatty 2",1480,720,160,112,properties("P-002-B2",62,132,928,2,82,"DAF conforme o PBIP.","T-B2"),"cap-beatty-2"),
    node(r,"node-weld-2","process","Beatty 1",1530,940,160,112,properties("P-002-B1",62,132,928,2,82,"Volvo VM conforme o PBIP.","T-B1"),"cap-beatty"),
    node(r,"node-weld-3","process","P.A",1770,500,165,118,properties("P-006",0,0,0,2,90,"Máquina P.A. FH e Scania usam esta etapa; o CNC é uma máquina separada.","T-P.A"),"cap-pa"),
    node(r,"node-cnc","process","CNC Plasma",1770,700,165,118,properties("P-007",0,0,0,2,90,"Máquina CNC. VM e DAF usam esta etapa; a P.A é uma máquina separada.","T-CNC"),"cap-cnc"),
    node(r,"node-assembly","process","Pintura",2090,500,175,118,properties("P-003",110,150,528,2,60,"Linha de pintura comum. Rebitagem fica em máquina/processo separado.","T-LPP2"),"cap-paint"),
    node(r,"node-rework","process","Rebitagem",2090,700,175,118,properties("P-008",0,0,0,2,90,"Etapa adicional para Scania e DAF, conforme medidas T-SCA-REB e T-DAF-REB.")),
    node(r,"node-inspection","process","Stenhoj",2410,500,175,118,properties("P-004",60,110,960,2,90,"Máquina Stenhoj. Embalagem fica separada.","T-STJ"),"cap-stenhoj"),
    node(r,"node-packaging","process","Embalagem",2410,700,175,118,properties("P-009",0,0,0,2,90,"Embalagem final. Para VM, o PBIP usa T-EMB-VM; a unidade é derivada da cadência média.")),
    node(r,"node-finished","storage","Armazém\nProduto acabado",2680,585,150,118,properties("BUF-002",0,100,720,2,95,"","D-E-PA")),
    node(r,"node-shipping","truck","Expedição",2920,600,120,90,properties("LOG-001")),
    node(r,"node-volvo","customer_supplier","VOLVO",3290,430,120,78,properties("CLI-001")),
    node(r,"node-scania","customer_supplier","SCANIA",3290,570,120,78,properties("CLI-002")),
    node(r,"node-daf","customer_supplier","DAF",3290,710,120,78,properties("CLI-003")),
    node(r,"node-renault","customer_supplier","RENAULT",3290,850,120,78,properties("CLI-004")),
    node(r,"node-toolroom","information","Ferramentaria",650,1180,180,72,properties("SUP-001")),
    node(r,"node-maintenance","information","Manutenção",900,1180,180,72,properties("SUP-002")),
    node(r,"node-lab","information","Laboratório",1150,1180,180,72,properties("SUP-003")),
    node(r,"node-quality-control","information","Controle de\nQualidade",1400,1180,180,72,properties("SUP-004")),
  ];
  const edges: LayoutEdge[] = [];
  const add = (id: string, source: string, target: string, flow: MifcFlowType, curve = 0) => edges.push(edge(r,id,source,target,flow,curve));
  add("mat-01","node-usiminas","node-beneficiator","material_push",-30); add("mat-02","node-csn","node-beneficiator","material_push",0); add("mat-03","node-gerdau","node-beneficiator","material_push",30);
  add("mat-beneficiator","node-beneficiator","node-raw","material_push"); add("mat-04","node-raw","node-cut","material_push"); add("mat-05","node-cut","node-rf2","material_push"); add("mat-05-rf2","node-rf2","node-stamp","material_push"); add("mat-06","node-stamp","node-weld-1","material_push");
  ["node-weld-2","node-beatty-2","node-beatty-3","node-beatty-4"].forEach((target,index) => add(`mat-07-${index+1}`,"node-weld-1",target,"material_push",(index-1.5)*18));
  ["node-weld-2","node-beatty-2","node-beatty-3","node-beatty-4"].forEach((source,index) => { add(`mat-08-${index+1}`,source,"node-weld-3","material_push",(index-1.5)*18); add(`mat-08-cnc-${index+1}`,source,"node-cnc","material_push",(index-1.5)*18); });
  add("mat-09","node-weld-3","node-assembly","material_push"); add("mat-09-cnc","node-cnc","node-rework","material_push"); add("mat-10","node-assembly","node-inspection","material_push"); add("mat-10-rework","node-rework","node-packaging","material_push"); add("mat-11","node-inspection","node-finished","material_push"); add("mat-11-packaging","node-packaging","node-finished","material_push"); add("mat-12","node-finished","node-shipping","material_push");
  add("mat-13","node-shipping","node-volvo","material_push",-25); add("mat-14","node-shipping","node-scania","material_push",-8); add("mat-15","node-shipping","node-daf","material_push",12); add("mat-16","node-shipping","node-renault","material_push",30);
  add("inf-01","node-erp","node-mrp","electronic_information",-18); add("inf-02","node-erp","node-planning","electronic_information",-8); add("inf-03","node-erp","node-quality-info","electronic_information",8); add("inf-04","node-erp","node-maint-info","electronic_information",18);
  add("inf-05","node-mrp","node-logistics","information",0); add("inf-06","node-quality-info","node-purchasing","information",0); add("inf-07","node-planning","node-edi","information",-18); add("inf-08","node-logistics","node-edi","information",15); add("inf-09","node-purchasing","node-edi","information",-15);
  ["node-cut","node-rf2","node-stamp","node-weld-1","node-weld-2","node-beatty-2","node-beatty-3","node-beatty-4","node-weld-3","node-cnc","node-assembly","node-rework","node-inspection","node-packaging"].forEach((target,index) => add(`edi-${index+1}`,"node-edi",target,"electronic_information",(index-6.5)*12));
  add("sup-01","node-toolroom","node-stamp","information",-70); add("sup-02","node-maintenance","node-weld-2","information",-65); add("sup-03","node-lab","node-weld-3","information",-70); add("sup-03-cnc","node-lab","node-cnc","information",-45); add("sup-04","node-quality-control","node-inspection","information",-60); add("sup-04-packaging","node-quality-control","node-packaging","information",-40);
  add("sup-05","node-cut","node-toolroom","information",75); add("sup-06","node-weld-1","node-maintenance","information",65); add("sup-07","node-weld-2","node-lab","information",75); add("sup-08","node-assembly","node-quality-control","information",65); add("sup-08-rework","node-rework","node-quality-control","information",45);
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

function migrateReadableLayout(revisions: LayoutRevision[]): LayoutRevision[] {
  const baseline = initialRevision().nodes;
  for (const revision of revisions) {
    for (const target of baseline) {
      const current = revision.nodes.find((item) => item.id === target.id || item.id.endsWith(`-${target.id}`));
      if (!current) continue;
      current.x = target.x;
      current.y = target.y;
      current.width = target.width;
      current.height = target.height;
    }
  }
  return revisions;
}

function migrateBeneficiator(revisions: LayoutRevision[]): LayoutRevision[] {
  const template = initialRevision().nodes.find((item) => item.id === "node-beneficiator")!;
  for (const revision of revisions) {
    const raw = revision.nodes.find((item) => item.id === "node-raw" || item.id.endsWith("-node-raw"));
    if (!raw) continue;
    const prefix = raw.id.slice(0, -"node-raw".length);
    const id = `${prefix}node-beneficiator`;
    let beneficiator = revision.nodes.find((item) => item.id === id);
    if (!beneficiator) {
      beneficiator = { ...clone(template), id, revisionId: revision.id };
      revision.nodes.push(beneficiator);
    }
    const supplierIds = ["node-usiminas", "node-csn", "node-gerdau"].map((suffix) => `${prefix}${suffix}`);
    for (const item of revision.edges) {
      if (item.flowType === "material_push" && supplierIds.includes(item.sourceNodeId) && item.targetNodeId === raw.id) item.targetNodeId = beneficiator.id;
    }
    for (const [index, supplierId] of supplierIds.entries()) {
      if (!revision.nodes.some((item) => item.id === supplierId)) continue;
      if (!revision.edges.some((item) => item.flowType === "material_push" && item.sourceNodeId === supplierId && item.targetNodeId === beneficiator.id)) {
        revision.edges.push(edge(revision.id, `${prefix}mat-beneficiator-in-${index + 1}`, supplierId, beneficiator.id, "material_push", (index - 1) * 30));
      }
    }
    if (!revision.edges.some((item) => item.flowType === "material_push" && item.sourceNodeId === beneficiator.id && item.targetNodeId === raw.id)) {
      revision.edges.push(edge(revision.id, `${prefix}mat-beneficiator`, beneficiator.id, raw.id, "material_push"));
    }
  }
  return revisions;
}

function migrateExpandedLayout(revisions: LayoutRevision[]): LayoutRevision[] {
  const baseline = initialRevision().nodes;
  for (const revision of revisions) {
    for (const target of baseline) {
      const current = revision.nodes.find((item) => item.id === target.id || item.id.endsWith(`-${target.id}`));
      if (!current) continue;
      current.x = target.x;
      current.y = target.y;
      current.width = target.width;
      current.height = target.height;
    }
  }
  return revisions;
}

/**
 * The first reference layout grouped physically different machines into one
 * card. This migration keeps the user's node positions/labels where possible,
 * then adds the missing machines and only changes the old stock-flow edges.
 */
function migrateMachineSeparation(revisions: LayoutRevision[]): LayoutRevision[] {
  const baseline = new Map(initialRevision().nodes.map((item) => [item.id, item]));
  const suffixId = (id: string, suffix: string) => id === suffix ? "" : id.endsWith(`-${suffix}`) ? id.slice(0, -suffix.length) : "";
  for (const revision of revisions) {
    const find = (suffix: string) => revision.nodes.find((item) => item.id === suffix || item.id.endsWith(`-${suffix}`));
    const ensure = (suffix: string): LayoutNode | undefined => {
      const current = find(suffix);
      if (current) return current;
      const template = baseline.get(suffix);
      const anchor = find("node-cut") ?? revision.nodes[0];
      if (!template || !anchor) return undefined;
      const prefix = suffixId(anchor.id, "node-cut");
      const created = { ...clone(template), id: `${prefix}${suffix}`, revisionId: revision.id };
      revision.nodes.push(created);
      return created;
    };
    const replaceOld = (suffix: string, label: string, processId: string | undefined, calculationKey: string) => {
      const current = find(suffix);
      if (!current) return;
      if (["LCT / RF2", "P.A / CNC", "Pintura / Rebitagem", "Stenhoj / Embalagem", "Corte", "Solda 3", "Montagem", "Inspeção"].includes(current.label)) current.label = label;
      if (processId) current.processId = processId;
      const template = baseline.get(suffix);
      if (template && (!current.properties.calculationKey || current.properties.calculationKey.includes("/"))) {
        current.properties = { ...current.properties, ...clone(template.properties), calculationKey };
      } else current.properties.calculationKey = calculationKey;
      current.validationStatus = processId ? "mapped" : current.validationStatus;
    };

    const lct = find("node-cut");
    const rf2 = ensure("node-rf2");
    replaceOld("node-cut", "LCT", "cap-lct", "T-LCT/RF2");
    if (lct && rf2 && !revision.edges.some((item) => item.flowType === "material_push" && item.sourceNodeId === lct.id && item.targetNodeId === rf2.id)) {
      rf2.x = Math.max(rf2.x, lct.x);
      rf2.y = lct.y + lct.height + 56;
      const directToRf3 = revision.edges.filter((item) => item.flowType === "material_push" && item.sourceNodeId === lct.id && find("node-stamp")?.id === item.targetNodeId);
      for (const item of directToRf3) item.sourceNodeId = rf2.id;
      revision.edges.push(edge(revision.id, `${lct.id}-to-rf2`, lct.id, rf2.id, "material_push"));
      const edi = find("node-edi");
      if (edi && !revision.edges.some((item) => item.sourceNodeId === edi.id && item.targetNodeId === rf2.id)) revision.edges.push(edge(revision.id, `${edi.id}-to-rf2`, edi.id, rf2.id, "electronic_information", -18));
    }

    const pa = find("node-weld-3");
    const cnc = ensure("node-cnc");
    replaceOld("node-weld-3", "P.A", "cap-pa", "T-P.A");
    if (pa && cnc) {
      cnc.x = pa.x;
      cnc.y = pa.y + pa.height + 82;
      const beattySources = revision.edges.filter((item) => item.flowType === "material_push" && find("node-weld-2") && [find("node-weld-2")?.id, find("node-beatty-2")?.id, find("node-beatty-3")?.id, find("node-beatty-4")?.id].includes(item.sourceNodeId) && item.targetNodeId === pa.id);
      for (const item of beattySources) {
        const id = `${item.id}-cnc`;
        if (!revision.edges.some((entry) => entry.id === id || (entry.sourceNodeId === item.sourceNodeId && entry.targetNodeId === cnc.id))) revision.edges.push(edge(revision.id, id, item.sourceNodeId, cnc.id, "material_push", item.curveOffset));
      }
      const edi = find("node-edi");
      if (edi && !revision.edges.some((item) => item.sourceNodeId === edi.id && item.targetNodeId === cnc.id)) revision.edges.push(edge(revision.id, `${edi.id}-to-cnc`, edi.id, cnc.id, "electronic_information", -6));
    }

    const paint = find("node-assembly");
    const rework = ensure("node-rework");
    replaceOld("node-assembly", "Pintura", "cap-paint", "T-LPP2");
    if (paint && rework) {
      rework.x = paint.x;
      rework.y = paint.y + paint.height + 82;
      const cncEdge = revision.edges.find((item) => item.flowType === "material_push" && find("node-cnc")?.id === item.sourceNodeId && item.targetNodeId === find("node-inspection")?.id);
      if (cncEdge) { cncEdge.targetNodeId = rework.id; }
      else if (cnc && !revision.edges.some((item) => item.sourceNodeId === cnc.id && item.targetNodeId === rework.id)) revision.edges.push(edge(revision.id, `${cnc.id}-to-rework`, cnc.id, rework.id, "material_push"));
    }

    const stenhoj = find("node-inspection");
    const packaging = ensure("node-packaging");
    replaceOld("node-inspection", "Stenhoj", "cap-stenhoj", "T-STJ");
    if (stenhoj && packaging) {
      packaging.x = stenhoj.x;
      packaging.y = stenhoj.y + stenhoj.height + 82;
      const oldDownstream = revision.edges.find((item) => item.flowType === "material_push" && item.sourceNodeId === stenhoj.id && find("node-finished")?.id === item.targetNodeId);
      if (oldDownstream && !revision.edges.some((item) => item.flowType === "material_push" && item.sourceNodeId === packaging.id && item.targetNodeId === oldDownstream.targetNodeId)) revision.edges.push(edge(revision.id, `${packaging.id}-to-finished`, packaging.id, oldDownstream.targetNodeId, "material_push", 28));
      const reworkEdge = revision.edges.find((item) => item.flowType === "material_push" && rework?.id === item.sourceNodeId && item.targetNodeId === stenhoj.id);
      if (reworkEdge) reworkEdge.targetNodeId = packaging.id;
      else if (rework && !revision.edges.some((item) => item.flowType === "material_push" && item.sourceNodeId === rework.id && item.targetNodeId === packaging.id)) revision.edges.push(edge(revision.id, `${rework.id}-to-packaging`, rework.id, packaging.id, "material_push"));
    }
    const edi = find("node-edi");
    if (edi && packaging && !revision.edges.some((item) => item.sourceNodeId === edi.id && item.targetNodeId === packaging.id)) revision.edges.push(edge(revision.id, `${edi.id}-to-packaging`, edi.id, packaging.id, "electronic_information", 18));
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
        if ([2,3,4,5,6,7,8,9,10].includes(parsed?.schemaVersion ?? 0) && Array.isArray(parsed?.revisions) && parsed.revisions.length && typeof parsed.activeRevisionId === "string") {
          const labeled = parsed.schemaVersion === 2 ? migrateLegacyProcessLabels(parsed.revisions) : parsed.revisions;
          const beattys = (parsed.schemaVersion ?? 0) < 4 ? migrateBeattyLayout(labeled) : labeled;
          const readable = (parsed.schemaVersion ?? 0) < 5 ? migrateReadableLayout(beattys) : beattys;
          const beneficiated = (parsed.schemaVersion ?? 0) < 6 ? migrateBeneficiator(readable) : readable;
          const expanded = (parsed.schemaVersion ?? 0) < 7 ? migrateExpandedLayout(beneficiated) : beneficiated;
          const separated = (parsed.schemaVersion ?? 0) < 8 ? migrateMachineSeparation(expanded) : expanded;
          this.revisions = (parsed.schemaVersion ?? 0) >= 9 ? migrateReadableLayout(separated) : separated;
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
    moveNode(id: string, x: number, y: number) { const item = this.activeRevision.nodes.find((entry) => entry.id === id); if (item) { item.x = clamp(x, 0, LAYOUT_WORLD_WIDTH - item.width); item.y = clamp(y, 0, LAYOUT_PROCESS_AREA_BOTTOM - item.height); } },
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
    addNode(type: LayoutNodeType, x = 720, y = 330, labelOverride?: string) { this.beginMutation(); const id = makeId("node"); const count = this.activeRevision.nodes.filter((item) => item.type === type).length + 1; const labels: Record<LayoutNodeType,string> = { process:"Novo processo", storage:"Armazenamento", stagnation:"Estagnação", database:"Base de dados", customer_supplier:"Cliente / fornecedor", truck:"Caminhão", kanban:"Kanban", information:"Informação", text:"Texto" }; this.activeRevision.nodes.push(node(this.activeRevision.id,id,type,labelOverride || labels[type],x,y,type === "process" ? 108 : 96,type === "process" ? 74 : 58,properties(`${type.slice(0,3).toUpperCase()}-${String(count).padStart(3,"0")}`))); this.selectNode(id); this.activeTool = "select"; },
    duplicateSelected() { const source = this.selectedNode; if (!source) return; this.beginMutation(); const copy = clone(source); copy.id = makeId("node"); copy.label = `${source.label} — cópia`; copy.x += 28; copy.y += 28; copy.processId = undefined; copy.validationStatus = "pending"; this.activeRevision.nodes.push(copy); this.selectNode(copy.id); },
    deleteSelected() { if (!this.selectedNodeId && !this.selectedEdgeId) return; this.beginMutation(); if (this.selectedNodeId) { const id = this.selectedNodeId; this.activeRevision.nodes = this.activeRevision.nodes.filter((item) => item.id !== id); this.activeRevision.edges = this.activeRevision.edges.filter((item) => item.sourceNodeId !== id && item.targetNodeId !== id); } else this.activeRevision.edges = this.activeRevision.edges.filter((item) => item.id !== this.selectedEdgeId); this.selectedNodeId = null; this.selectedEdgeId = null; },
    deleteNodes(ids: string[]) { const selected = new Set(ids); if (!selected.size) return; this.beginMutation(); this.activeRevision.nodes = this.activeRevision.nodes.filter((item) => !selected.has(item.id)); this.activeRevision.edges = this.activeRevision.edges.filter((item) => !selected.has(item.sourceNodeId) && !selected.has(item.targetNodeId)); this.selectedNodeId = null; this.selectedEdgeId = null; },
    connectNode(id: string, flowType: MifcFlowType = "material_push") { if (!this.connectSourceId) { this.connectSourceId = id; return; } if (canConnect(this.activeRevision.edges,this.connectSourceId,id,flowType)) { this.beginMutation(); this.activeRevision.edges.push(edge(this.activeRevision.id,makeId("edge"),this.connectSourceId,id,flowType,0)); } this.connectSourceId = null; this.activeTool = "select"; },
    updateSelectedEdge(patch: Partial<Pick<LayoutEdge,"flowType"|"sourceNodeId"|"targetNodeId"|"curveOffset">>) { const item = this.selectedEdge; if (!item) return; this.beginMutation(); Object.assign(item,clone(patch)); },
    save() { this.activeRevision.savedAt = new Date().toISOString(); const payload: PersistedLayout = { schemaVersion: 8, activeRevisionId: this.activeRevisionId, revisions: this.revisions }; localStorage.setItem(storageKey,JSON.stringify(payload)); this.persistedGraph = JSON.stringify(graphSnapshot(this.activeRevision)); },
    switchRevision(id: string) { const revision = this.revisions.find((item) => item.id === id); if (!revision || id === this.activeRevisionId) return; if (this.isDirty) this.save(); this.activeRevisionId = id; this.selectedNodeId = revision.nodes[0]?.id ?? null; this.selectedEdgeId = null; this.undoStack = []; this.redoStack = []; this.persistedGraph = JSON.stringify(graphSnapshot(revision)); this.save(); },
    createRevision() { this.save(); const number = Math.max(...this.revisions.map((item) => item.number)) + 1; const revisionId = makeId("layout-rev"); const source = this.activeRevision; const nodeIds = new Map(source.nodes.map((item) => [item.id,`${revisionId}-${item.id}`])); const revision: LayoutRevision = { id:revisionId, number, label:`Rev. ${String(number).padStart(2,"0")} (Rascunho)`, createdAt:new Date().toISOString(), nodes:source.nodes.map((item) => ({...clone(item),id:nodeIds.get(item.id)!,revisionId})), edges:source.edges.map((item) => ({...clone(item),id:makeId("edge"),revisionId,sourceNodeId:nodeIds.get(item.sourceNodeId)!,targetNodeId:nodeIds.get(item.targetNodeId)!})) }; this.revisions.push(revision); this.activeRevisionId = revisionId; this.undoStack = []; this.redoStack = []; this.selectedNodeId = revision.nodes[0]?.id ?? null; this.selectedEdgeId = null; this.persistedGraph = JSON.stringify(graphSnapshot(revision)); this.save(); },
  },
});
