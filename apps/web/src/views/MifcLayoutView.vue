<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { ChevronDown, Copy, Eye, Hand, Layers3, Maximize2, Minimize2, Minus, MousePointer2, Plus, Redo2, Save, Trash2, Type as TypeIcon, Undo2, Waypoints } from "@lucide/vue";
import type { MifcFlowType } from "@mifc/domain";
import MifcNodeCard from "@/components/layout/MifcNodeCard.vue";
import MifcPropertiesPanel from "@/components/layout/MifcPropertiesPanel.vue";
import MifcSymbolPalette from "@/components/layout/MifcSymbolPalette.vue";
import LayoutBufferCard from "@/components/layout/LayoutBufferCard.vue";
import LayoutValueTracePanel from "@/components/layout/LayoutValueTracePanel.vue";
import { buildClientProcessPath, clientProcessLanes, mappingForClientStage, positionClientStages, type ClientProcessLane, type ClientStageMapping, type PositionedClientStage } from "@/domain/client-process-matrix";
import { positionLayoutBuffers, type PositionedLayoutBuffer } from "@/domain/layout-buffers";
import { edgeGeometry } from "@/domain/layout-graph";
import { beginNodePointerSelection, finishNodePointerSelection } from "@/domain/layout-selection";
import { calculateLayoutProcessMeasures, formatMeasureValues, formatProcessDays } from "@/domain/layout-process-measures";
import { calculateClientTotal, type LayoutValueTrace } from "@/domain/layout-value-lineage";
import { useMifcFormsStore, type BufferFormRow } from "@/stores/mifc-forms";
import { LAYOUT_WORLD_HEIGHT, LAYOUT_WORLD_WIDTH, useMifcLayoutStore, type LayoutEdge, type LayoutNode, type LayoutNodeProperties, type LayoutNodeType, type LayoutTool } from "@/stores/mifc-layout";
import { useUiStore } from "@/stores/ui";
import { useOperationsStore } from "@/stores/operations";
import { effectiveActionStatus } from "@/domain/operations";

const WORLD_WIDTH = LAYOUT_WORLD_WIDTH;
const WORLD_HEIGHT = LAYOUT_WORLD_HEIGHT;
const route = useRoute();
const layout = useMifcLayoutStore();
const forms = useMifcFormsStore();
const ui = useUiStore();
const operations = useOperationsStore();
const { activeRevision, selectedNode, selectedEdge, isDirty, undoStack, redoStack, activeTool, connectSourceId } = storeToRefs(layout);
const layoutPage = ref<HTMLElement | null>(null);
const canvas = ref<HTMLElement | null>(null);
const zoom = ref(.72);
const pan = reactive({ x: 0, y: 0 });
const isFullscreen = ref(false);
const fullscreenOrigin = reactive({ zoom: .72, x: 0, y: 0 });
const panelOpen = ref(true);
const renameFocusRequest = ref(0);
const showLayers = ref(false);
const visibleLayers = reactive({ information: true, material: true, metrics: true });
const activeFlow = ref<MifcFlowType>("material_push");
const selectedNodeIds = ref<string[]>([]);
const selectedTrace = ref<LayoutValueTrace | null>(null);
const selectedBufferId = ref<string | null>(null);
const suppressNextNodeClick = ref(false);
type MeasureDiagnostics = {
  contextDate: string;
  rows: Record<string, { cached: number; filtered: number }>;
  operationalRows?: Record<string, number>;
  operationalReady?: Record<string, boolean>;
};
const todayKey = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; };
const selectedDate = ref(todayKey());
const oracleMeasures = ref<{ ready: boolean; values: Record<string, number> | null; diagnostics?: MeasureDiagnostics; updatedAt: string | null }>({ ready: false, values: null, updatedAt: null });
let layoutMeasuresTimer: ReturnType<typeof setInterval> | undefined;
const interaction = reactive({ mode: "" as ""|"drag"|"resize"|"curve"|"pan", id: "", pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, originWidth: 0, originHeight: 0, originCurve: 0, horizontal: true, recorded: false, toggleOffOnClick: false, groupOrigins: {} as Record<string,{x:number;y:number}> });

const nodesById = computed(() => new Map(activeRevision.value.nodes.map((node) => [node.id,node])));
const renderedEdges = computed(() => activeRevision.value.edges.map((edge) => {
  const source = nodesById.value.get(edge.sourceNodeId); const target = nodesById.value.get(edge.targetNodeId);
  return source && target ? { ...edge, geometry: edgeGeometry(source,target,edge.curveOffset) } : null;
}).filter((edge): edge is NonNullable<typeof edge> => Boolean(edge)));
const positionedClientStages = computed(() => positionClientStages(activeRevision.value.nodes));
const clientLanes = computed(() => clientProcessLanes.map((lane) => ({ ...lane, path: buildClientProcessPath(lane, positionedClientStages.value,40,10) })));
const availableMinutes = (capacityId: string) => (forms.capacityRows.find((row) => row.id === capacityId)?.availableHoursPerDay ?? 0) * 60;
const processMeasureValues = computed<Record<string, number>>(() => calculateLayoutProcessMeasures(oracleMeasures.value.values, {
  rf3: availableMinutes("cap-rf3"),
  beatty1: availableMinutes("cap-beatty"),
  beatty2: availableMinutes("cap-beatty-2"),
  beatty3: availableMinutes("cap-beatty-3"),
  beatty4: availableMinutes("cap-beatty-4"),
  lct: availableMinutes("cap-lct"),
  pa: availableMinutes("cap-pa"),
  cnc: availableMinutes("cap-cnc"),
  paint: availableMinutes("cap-paint"),
  stenhoj: availableMinutes("cap-stenhoj"),
}));
const positionedBuffers = computed(() => positionLayoutBuffers(forms.bufferRows, activeRevision.value.nodes));
const clientTotals = computed(() => Object.fromEntries(clientProcessLanes.map((lane) => [lane.key, calculateClientTotal(lane.key, oracleMeasures.value.values)])) as Record<ClientProcessLane["key"], ReturnType<typeof calculateClientTotal>>);
const processTraceConfig: Record<string, { capacityId?: string; demandKey?: string; formula: string }> = {
  "T-RF3": { capacityId: "cap-rf3", demandKey: "D-P-RF3", formula: "minutos disponíveis ÷ demanda em peças ÷ 1.440" },
  "T-B1": { capacityId: "cap-beatty", demandKey: "D-P-B1", formula: "minutos disponíveis ÷ demanda em peças ÷ 1.440" },
  "T-B2": { capacityId: "cap-beatty-2", demandKey: "D-P-B2", formula: "minutos disponíveis ÷ demanda em peças ÷ 1.440" },
  "T-B3": { capacityId: "cap-beatty-3", demandKey: "D-P-B3", formula: "minutos disponíveis ÷ demanda em peças ÷ 1.440" },
  "T-B4": { capacityId: "cap-beatty-4", demandKey: "D-P-B4", formula: "minutos disponíveis ÷ demanda em peças ÷ 1.440" },
  "T-LCT/RF2": { capacityId: "cap-lct", demandKey: "D-P-RF2", formula: "minutos disponíveis ÷ demanda RF2 em peças ÷ 1.440" },
  "T-P.A": { capacityId: "cap-pa", demandKey: "D-P-P.A", formula: "minutos disponíveis ÷ demanda P.A em peças ÷ 1.440" },
  "T-CNC": { capacityId: "cap-cnc", demandKey: "D-P-CNC", formula: "minutos disponíveis ÷ demanda CNC em peças ÷ 1.440" },
  "T-LPP2": { capacityId: "cap-paint", demandKey: "D-P-LPP2", formula: "minutos disponíveis ÷ demanda de pintura em peças ÷ 1.440" },
  "T-SCA-REB": { capacityId: "cap-stenhoj", demandKey: "D-P-SCA-REB", formula: "minutos disponíveis ÷ demanda Scania de rebitagem ÷ 1.440" },
  "T-DAF-REB": { capacityId: "cap-stenhoj", demandKey: "D-P-DAF-REB", formula: "minutos disponíveis ÷ demanda DAF de rebitagem ÷ 1.440" },
  "T-STJ": { capacityId: "cap-stenhoj", demandKey: "D-P-STJ", formula: "minutos disponíveis ÷ demanda Stenhoj em peças ÷ 1.440" },
  "T-EMB-VM": { demandKey: "P-M-VM", formula: "1 ÷ produção média diária de Volvo VM" },
  "T-M3": { formula: "0 (constante explícita no modelo semântico; validação operacional pendente)" },
};
const productionKeys: Record<string, { production: string[]; demand: string[]; stops: string[] }> = {
  "T-RF3": { production: ["P-RF3"], demand: ["D-P-RF3"], stops: ["P-P-RF3"] },
  "T-B1": { production: ["P-B1"], demand: ["D-P-B1"], stops: ["P-P-B1"] },
  "T-B2": { production: ["P-B2"], demand: ["D-P-B2"], stops: ["P-P-B2"] },
  "T-B3": { production: ["P-B3"], demand: ["D-P-B3"], stops: ["P-P-B3"] },
  "T-B4": { production: ["P-B4"], demand: ["D-P-B4"], stops: ["P-P-B4"] },
  "T-P.A/T-CNC": { production: ["P-P.A", "P-CNC"], demand: ["D-P-P.A", "D-P-CNC"], stops: ["P-P-P.A", "P-P-CNC"] },
  "T-LPP2": { production: ["P-LPP2"], demand: ["D-P-LPP2"], stops: ["P-P-LPP2"] },
  "T-STJ/T-EMB-VM": { production: ["P-STJ"], demand: ["D-P-STJ"], stops: ["P-P-STJ"] },
};
function sumMeasureKeys(keys: string[]): number { return keys.reduce((total, key) => total + Number(oracleMeasures.value.values?.[key] ?? 0), 0); }
function liveMetricsForNode(node: LayoutNode) {
  const keys = productionKeys[node.properties.calculationKey];
  if (!keys || !oracleMeasures.value.diagnostics?.operationalReady?.producao) return undefined;
  return {
    production: sumMeasureKeys(keys.production),
    demand: sumMeasureKeys(keys.demand),
    stopMinutes: oracleMeasures.value.diagnostics.operationalReady.paradas ? sumMeasureKeys(keys.stops) : undefined,
  };
}
function actionSummaryForNode(node: LayoutNode) {
  const process = operations.processes.find((item) => item.layoutNodeId === node.id || item.id === node.processId);
  const actions = operations.actions.filter((item) => item.layoutNodeId === node.id || item.processId === process?.id);
  return { open: actions.filter((item) => !["completed","cancelled"].includes(item.status)).length, overdue: actions.filter((item) => effectiveActionStatus(item) === "overdue").length };
}
const filteredRowSummary = computed(() => Object.values(oracleMeasures.value.diagnostics?.rows ?? {}).reduce((total, item) => total + item.filtered, 0));
const worldStyle = computed(() => ({ width:`${WORLD_WIDTH}px`, height:`${WORLD_HEIGHT}px`, transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom.value})` }));

function isInformationNode(node: LayoutNode) { return ["database","information","text"].includes(node.type); }
function isInformationEdge(edge: LayoutEdge) { return ["information","electronic_information"].includes(edge.flowType); }
function displayNode(node: LayoutNode): LayoutNode {
  const capacity = node.processId ? forms.capacityRows.find((row) => row.id === node.processId) : undefined;
  if (!capacity) return node;
  return {
    ...node,
    properties: {
      ...node.properties,
      code: capacity.processCode,
      cycleTimeSeconds: capacity.cycleTimeSeconds,
      wipPieces: capacity.targetWipPieces,
      capacityPerDay: capacity.referenceCapacityPerDay ?? 0,
      shifts: capacity.shifts,
      availabilityPercent: capacity.efficiencyPercent,
    },
  };
}
function setTool(tool: LayoutTool) { layout.setTool(tool); showLayers.value = false; }
function chooseConnect(flow: MifcFlowType) { activeFlow.value = flow; layout.setTool("connect"); }
function worldCenter() { const rect = canvas.value?.getBoundingClientRect(); return { x:((rect?.width ?? 1000)/2-pan.x)/zoom.value, y:((rect?.height ?? 700)/2-pan.y)/zoom.value }; }
function worldPoint(event: PointerEvent) { const rect = canvas.value!.getBoundingClientRect(); return { x:(event.clientX-rect.left-pan.x)/zoom.value, y:(event.clientY-rect.top-pan.y)/zoom.value }; }
function addSymbol(type: LayoutNodeType, label?: string) { const point = worldCenter(); layout.addNode(type,point.x-55,point.y-35,label); selectedTrace.value=null; panelOpen.value = true; }
function clearSelection() { selectedNodeIds.value=[]; selectedTrace.value=null; selectedBufferId.value=null; layout.selectNode(null); layout.selectEdge(null); }
function openTrace(trace: LayoutValueTrace, bufferId?: string) { selectedTrace.value=trace;selectedBufferId.value=bufferId??null;panelOpen.value=true; }
function stageTrace(lane: ClientProcessLane, stage: PositionedClientStage): LayoutValueTrace {
  const mapping = mappingFor(lane, stage);
  const processKeys = mapping?.processMeasureKeys ?? [];
  const stockKeys = mapping?.stockMeasureKeys ?? [];
  const missingKeys = [...processKeys.filter((key) => !Number.isFinite(processMeasureValues.value[key])), ...stockKeys.filter((key) => !Number.isFinite(oracleMeasures.value.values?.[key]))];
  const inputs: LayoutValueTrace["inputs"] = processKeys.flatMap((key) => {
    const config = processTraceConfig[key];
    const result: LayoutValueTrace["inputs"] = [{ key, label: `Resultado ${key}`, value: processMeasureValues.value[key], unit: "dias", origin: "CALCULATED" }];
    if (config?.capacityId) result.push({ key: `${key}:minutes`, label: "Tempo disponível", value: availableMinutes(config.capacityId), unit: "min/dia", origin: "INPUT" });
    if (config?.demandKey) result.push({ key: config.demandKey, label: "Demanda filtrada", value: oracleMeasures.value.values?.[config.demandKey], unit: config.demandKey === "P-M-VM" ? "peças/dia" : "peças", origin: "ORACLE_MES" });
    return result;
  });
  inputs.push(...stockKeys.map((key) => ({ key, label: `Estoque/logística ${key}`, value: oracleMeasures.value.values?.[key], unit: "dias", origin: "ORACLE_MES" })));
  const formulas = processKeys.map((key) => `${key} = ${processTraceConfig[key]?.formula ?? "regra DAX catalogada"}`);
  return {
    id: `${lane.key}-${stage.id}`,
    title: `${lane.label} · ${stage.label}`,
    displayValue: mapping?.participates ? formatMeasureValues(processKeys, processMeasureValues.value) : "—",
    unit: "dias",
    formula: formulas.join(" | ") || "Etapa sem medida de processo no contexto do cliente",
    simpleExplanation: missingKeys.length ? "Uma ou mais entradas ainda não estão disponíveis para o mesmo cliente, processo e data. Por isso a tela não completa o valor com zero." : "O tempo da etapa usa os minutos disponíveis cadastrados e a demanda filtrada do mesmo período. Os estoques relacionados permanecem separados do tempo de processo.",
    inputs,
    intermediateResults: [...processKeys, ...stockKeys].map((key) => `${key} = ${formatProcessDays(Number(processMeasureValues.value[key] ?? oracleMeasures.value.values?.[key]))} dia`),
    origin: "MIXED — Oracle/MES + parâmetros locais",
    measureKeys: [...processKeys, ...stockKeys],
    filters: [`Calendar[Date] = ${selectedDate.value}`, `Cliente = ${lane.label}`, `Etapa = ${stage.label}`],
    client: lane.label,
    process: stage.label,
    date: selectedDate.value,
    updatedAt: oracleMeasures.value.updatedAt,
    sourceReference: mapping?.evidence ?? "docs/client-process-matrix.csv",
    missingKeys,
  };
}
function totalTrace(lane: ClientProcessLane): LayoutValueTrace {
  const total = clientTotals.value[lane.key];
  return {
    id: `total-${lane.key}`,
    title: `Tempo total do cliente — ${lane.label}`,
    displayValue: total.value === undefined ? "—" : formatProcessDays(total.value),
    unit: "dias",
    formula: `${total.measureKey} = ${total.formula}`,
    simpleExplanation: total.value === undefined ? "O total segue exatamente a medida DAX, mas uma ou mais parcelas não estão disponíveis. Nenhuma soma parcial é apresentada como total." : `O total de ${lane.label} resulta da soma das parcelas logísticas e de estoque definidas pela medida ${total.measureKey}, incluindo transporte e ${total.inputs.find((input) => input.key === "T-M")?.multiplier} movimentações.`,
    inputs: total.inputs.map((input) => ({ key: input.key, label: input.label, value: input.value * input.multiplier, textValue: input.multiplier > 1 ? `${input.value} × ${input.multiplier}` : undefined, unit: "dias", origin: input.origin === "CONSTANT" ? "Power BI — constante" : "Power BI — medida" })),
    intermediateResults: total.inputs.map((input) => `${input.key}${input.multiplier > 1 ? ` × ${input.multiplier}` : ""} = ${formatMeasureDetailed(input.value * input.multiplier)} dia`),
    origin: "MIXED — medidas Power BI reproduzidas localmente",
    measureKeys: [total.measureKey, ...total.inputs.map((input) => input.key)],
    filters: [`Calendar[Date] = ${selectedDate.value}`, `Cliente = ${lane.label}`, "Mesmo contexto do PBIP"],
    client: lane.label,
    date: selectedDate.value,
    updatedAt: oracleMeasures.value.updatedAt,
    sourceReference: total.sourceReference,
    missingKeys: total.missingKeys,
  };
}
function bufferTrace(buffer: PositionedLayoutBuffer): LayoutValueTrace {
  const missingKeys = [buffer.quantityPieces === null ? "WIP observado" : "", buffer.pairsPerDay <= 0 ? "Pares/dia" : "", !buffer.inputProcess ? "Processo anterior" : "", !buffer.outputProcess ? "Processo posterior" : ""].filter(Boolean);
  return {
    id: buffer.id,
    title: `Buffer · ${buffer.point}`,
    displayValue: buffer.wipDays === undefined ? "—" : buffer.wipDays.toLocaleString("pt-BR", { maximumFractionDigits: 3 }),
    unit: "dias de WIP",
    formula: "Dias de WIP = quantidade em peças ÷ 2 ÷ pares por dia",
    simpleExplanation: buffer.wipDays === undefined ? "O tempo do buffer não pode ser calculado até que WIP e ritmo diário estejam disponíveis." : `O buffer possui ${buffer.quantityPieces} peças. Convertendo para pares e dividindo por ${buffer.pairsPerDay} pares por dia, o estoque corresponde a ${buffer.wipDays.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} dia.`,
    inputs: [
      { key: "quantityPieces", label: "Quantidade / WIP", value: buffer.quantityPieces ?? undefined, unit: "peças", origin: buffer.origin },
      { key: "pairsPerDay", label: "Ritmo diário", value: buffer.pairsPerDay > 0 ? buffer.pairsPerDay : undefined, unit: "pares/dia", origin: "INPUT" },
      { key: "capacityPieces", label: "Capacidade do buffer", value: buffer.capacityPieces, unit: "peças", origin: "INPUT" },
    ],
    intermediateResults: buffer.quantityPieces === null ? [] : [`${buffer.quantityPieces} ÷ 2 = ${(buffer.quantityPieces / 2).toLocaleString("pt-BR")} pares`, ...(buffer.wipDays === undefined ? [] : [`${(buffer.quantityPieces / 2).toLocaleString("pt-BR")} ÷ ${buffer.pairsPerDay} = ${buffer.wipDays.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} dia`])],
    origin: buffer.origin === "INPUT" ? "Valor manual" : "Oracle/MES somente leitura",
    measureKeys: ["wip.days"],
    filters: [`Cliente = ${buffer.customer}`, `Ponto = ${buffer.point}`],
    client: buffer.customer,
    process: `${buffer.inputProcess || "—"} → ${buffer.outputProcess || "—"}`,
    date: selectedDate.value,
    updatedAt: buffer.sourceUpdatedAt ?? null,
    sourceReference: "MIFC-2023 linhas de espera; Calculation Engine rule wip.days",
    missingKeys,
  };
}
function nodeMetricTrace(node: LayoutNode, metric: "cycle"|"capacity"|"production") {
  const effective = displayNode(node);
  const metrics = liveMetricsForNode(node);
  if (metric === "cycle") openTrace({ id:`${node.id}-ct`,title:`${node.label} · Tempo de Ciclo`,displayValue:effective.properties.cycleTimeSeconds > 0 ? effective.properties.cycleTimeSeconds.toLocaleString("pt-BR") : "—",unit:"s/peça",formula:"Valor de entrada do cadastro Capacidade; não é recalculado no Layout.",simpleExplanation:"O Tempo de Ciclo é um parâmetro manual/importado da máquina. Alterações na tela Capacidade aparecem aqui imediatamente.",inputs:[{key:"cycleTimeSeconds",label:"Tempo de Ciclo — CT",value:effective.properties.cycleTimeSeconds || undefined,unit:"s/peça",origin:"INPUT"}],intermediateResults:[],origin:"Valor manual / importado",measureKeys:[],filters:[`Processo = ${node.label}`],process:node.label,date:selectedDate.value,updatedAt:forms.savedAt,sourceReference:"Cadastro Capacidade; docs/excel-manual-automatic-map.md",missingKeys:effective.properties.cycleTimeSeconds > 0 ? [] : ["Tempo de Ciclo"] });
  else if (metric === "capacity") openTrace({ id:`${node.id}-capacity`,title:`${node.label} · Capacidade por dia`,displayValue:effective.properties.capacityPerDay > 0 ? effective.properties.capacityPerDay.toLocaleString("pt-BR") : "—",unit:"peças/dia",formula:"Referência importada do processo. A regra genérica capacity.per_day permanece pendente e não é presumida.",simpleExplanation:"A capacidade exibida é a referência cadastrada. O sistema não inventa uma fórmula única enquanto a regra específica da máquina não estiver validada.",inputs:[{key:"referenceCapacityPerDay",label:"Capacidade de referência",value:effective.properties.capacityPerDay || undefined,unit:"peças/dia",origin:"IMPORT"}],intermediateResults:[],origin:"Importado",measureKeys:[],filters:[`Processo = ${node.label}`],process:node.label,date:selectedDate.value,updatedAt:forms.savedAt,sourceReference:"Cadastro Capacidade; regra capacity.per_day pendente",missingKeys:effective.properties.capacityPerDay > 0 ? [] : ["Capacidade de referência"] });
  else openTrace({ id:`${node.id}-production`,title:`${node.label} · Produção e demanda`,displayValue:metrics ? `${metrics.production.toLocaleString("pt-BR")} / ${metrics.demand.toLocaleString("pt-BR")}` : "—",unit:"peças",formula:"Produção observada / demanda filtrada conforme as medidas vinculadas ao processo.",simpleExplanation:"Os dois números usam a mesma data e o mesmo processo. Se o cache de Produção não estiver disponível, a tela mostra ausência em vez de zero.",inputs:[{key:"production",label:"Produção observada",value:metrics?.production,unit:"peças",origin:"ORACLE_MES"},{key:"demand",label:"Demanda",value:metrics?.demand,unit:"peças",origin:"ORACLE_MES"}],intermediateResults:[],origin:"Oracle/MES somente leitura",measureKeys:productionKeys[node.properties.calculationKey] ? [...productionKeys[node.properties.calculationKey].production,...productionKeys[node.properties.calculationKey].demand] : [],filters:[`Calendar[Date] = ${selectedDate.value}`,`Processo = ${node.label}`],process:node.label,date:selectedDate.value,updatedAt:oracleMeasures.value.updatedAt,sourceReference:"MIFC.SemanticModel/definition/tables/1-Measure.tmdl",missingKeys:metrics ? [] : ["Cache Produção"] });
}
function updateBuffer(id: string, patch: Partial<BufferFormRow>) { const row=forms.bufferRows.find((item)=>item.id===id);if(row)Object.assign(row,patch);const positioned=positionedBuffers.value.find((item)=>item.id===id);if(positioned)selectedTrace.value=bufferTrace(positioned); }
function focusNode(id: string) { const normalized=id.toLocaleLowerCase("pt-BR");const node=activeRevision.value.nodes.find((item)=>item.id===id||item.id.endsWith(`-${id}`)||item.label.replace(/\n/g," ").toLocaleLowerCase("pt-BR").includes(normalized));const rect=canvas.value?.getBoundingClientRect();if(!node||!rect)return;selectedTrace.value=null;selectedNodeIds.value=[node.id];layout.selectNode(node.id);panelOpen.value=true;pan.x=rect.width/2-(node.x+node.width/2)*zoom.value;pan.y=Math.max(8,rect.height*.35-(node.y+node.height/2)*zoom.value);renameFocusRequest.value+=1; }
function startPan(event: PointerEvent) {
  event.preventDefault();
  event.stopPropagation();
  canvas.value?.setPointerCapture?.(event.pointerId);
  Object.assign(interaction,{mode:"pan",pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:pan.x,originY:pan.y});
}
function onViewportPointerDown(event: PointerEvent) {
  if (event.button === 1 || (activeTool.value === "pan" && event.button === 0)) startPan(event);
}
function onCanvasPointerDown(event: PointerEvent) {
  if (activeTool.value === "text") { const point = worldPoint(event); layout.addNode("text",point.x,point.y); panelOpen.value = true; return; }
  clearSelection();
}
function startNodeDrag(event: PointerEvent,node: LayoutNode) {
  if (activeTool.value === "connect") return;
  event.preventDefault();
  selectedTrace.value=null;selectedBufferId.value=null;
  const additive=event.shiftKey||event.ctrlKey||event.metaKey;
  const pointerSelection=beginNodePointerSelection(selectedNodeIds.value,node.id,additive);
  selectedNodeIds.value=pointerSelection.selectedIds;
  layout.selectNode(node.id);panelOpen.value=true;suppressNextNodeClick.value=true;
  if(activeTool.value!=="select")return;
  const groupOrigins=Object.fromEntries(activeRevision.value.nodes.filter((item)=>pointerSelection.movingIds.includes(item.id)).map((item)=>[item.id,{x:item.x,y:item.y}]));
  Object.assign(interaction,{mode:"drag",id:node.id,startX:event.clientX,startY:event.clientY,originX:node.x,originY:node.y,recorded:false,toggleOffOnClick:pointerSelection.toggleOffOnClick,groupOrigins});
}
function startResize(event: PointerEvent,node: LayoutNode) { event.preventDefault(); selectedNodeIds.value=[node.id]; layout.selectNode(node.id); Object.assign(interaction,{mode:"resize",id:node.id,startX:event.clientX,startY:event.clientY,originWidth:node.width,originHeight:node.height,recorded:false}); }
function startCurve(event: PointerEvent,edge: typeof renderedEdges.value[number]) { event.preventDefault(); event.stopPropagation(); selectedNodeIds.value=[]; layout.selectEdge(edge.id); panelOpen.value = true; Object.assign(interaction,{mode:"curve",id:edge.id,startX:event.clientX,startY:event.clientY,originCurve:edge.curveOffset,horizontal:edge.geometry.horizontal,recorded:false}); }
function onPointerMove(event: PointerEvent) {
  if (!interaction.mode) return;
  event.preventDefault();
  const dx = event.clientX-interaction.startX; const dy = event.clientY-interaction.startY;
  if (interaction.mode === "pan") { pan.x=interaction.originX+dx; pan.y=interaction.originY+dy; return; }
  if (!interaction.recorded && Math.hypot(dx,dy)>2) { layout.beginMutation(); interaction.recorded=true; }
  if (!interaction.recorded) return;
  if (interaction.mode === "drag") for(const [id,origin] of Object.entries(interaction.groupOrigins)) layout.moveNode(id,origin.x+dx/zoom.value,origin.y+dy/zoom.value);
  if (interaction.mode === "resize") layout.resizeNode(interaction.id,interaction.originWidth+dx/zoom.value,interaction.originHeight+dy/zoom.value);
  if (interaction.mode === "curve") layout.moveEdgeCurve(interaction.id,interaction.originCurve+(interaction.horizontal?dy:dx)/zoom.value);
}
function endInteraction() {
  const wasDrag=interaction.mode==="drag";
  const moved=interaction.recorded;
  const interactedId=interaction.id;
  if(wasDrag)selectedNodeIds.value=finishNodePointerSelection(selectedNodeIds.value,interactedId,interaction.toggleOffOnClick,moved);
  if(wasDrag)layout.selectNode(selectedNodeIds.value.includes(interactedId)?interactedId:selectedNodeIds.value.at(-1)??null);
  const focusAfterClick=wasDrag&&!moved&&selectedNodeIds.value.length===1;
  if (interaction.pointerId >= 0 && canvas.value?.hasPointerCapture?.(interaction.pointerId)) canvas.value.releasePointerCapture(interaction.pointerId);
  interaction.mode=""; interaction.id=""; interaction.pointerId=-1; interaction.recorded=false; interaction.toggleOffOnClick=false; interaction.groupOrigins={};
  if(focusAfterClick)renameFocusRequest.value+=1;
  if(suppressNextNodeClick.value)setTimeout(()=>{suppressNextNodeClick.value=false;},0);
}
function onWheel(event: WheelEvent) { event.preventDefault(); setZoom(zoom.value+(event.deltaY<0 ? .06 : -.06)); }
function setZoom(value: number) { zoom.value=Math.min(1.5,Math.max(.35,value)); }
function fitView(readable=false) { const rect=canvas.value?.getBoundingClientRect(); if (!rect) return; const fitted=Math.min(1,(rect.width-28)/WORLD_WIDTH,(rect.height-28)/WORLD_HEIGHT); zoom.value=readable?Math.max(.68,fitted):fitted; pan.x=readable&&zoom.value>fitted?18:(rect.width-WORLD_WIDTH*zoom.value)/2; pan.y=readable&&zoom.value>fitted?8:(rect.height-WORLD_HEIGHT*zoom.value)/2; }
function selectNode(id: string,event?:MouseEvent|KeyboardEvent) { if(suppressNextNodeClick.value){suppressNextNodeClick.value=false;return;} selectedTrace.value=null;selectedBufferId.value=null;if (activeTool.value === "connect") layout.connectNode(id,activeFlow.value); else { const additive=Boolean(event&&(event.shiftKey||event.ctrlKey||event.metaKey)); if(additive)selectedNodeIds.value=selectedNodeIds.value.includes(id)?selectedNodeIds.value.filter((item)=>item!==id):[...selectedNodeIds.value,id];else selectedNodeIds.value=[id]; layout.selectNode(selectedNodeIds.value.includes(id)?id:selectedNodeIds.value.at(-1)??null); panelOpen.value=true; if(selectedNodeIds.value.length===1)renameFocusRequest.value+=1; } }
function selectEdge(id: string) { selectedTrace.value=null;selectedBufferId.value=null;selectedNodeIds.value=[]; layout.selectEdge(id); panelOpen.value=true; }
function mappingFor(lane: ClientProcessLane, stage: PositionedClientStage): ClientStageMapping | undefined { return mappingForClientStage(lane,stage); }
function mappingTitle(lane: ClientProcessLane, stage: PositionedClientStage) {
  const mapping = mappingFor(lane, stage);
  if (!mapping) return `${lane.label} · ${stage.label}`;
  const process = mapping.processMeasureKeys.length ? mapping.processMeasureKeys.join(" + ") : "sem medida de processo";
  const stock = mapping.stockMeasureKeys.length ? mapping.stockMeasureKeys.join(" + ") : "sem medida de estoque";
  const observed = mapping.processMeasureKeys.map((key) => processMeasureValues.value[key] === undefined ? null : `${key}: ${formatProcessDays(processMeasureValues.value[key])} dia (valor calculado ${formatMeasureDetailed(processMeasureValues.value[key])})`).filter(Boolean).join(" · ");
  const stockObserved = mapping.stockMeasureKeys.map((key) => oracleMeasures.value.values?.[key] === undefined ? null : `${key}: ${formatProcessDays(Number(oracleMeasures.value.values[key]))} dia`).filter(Boolean).join(" · ");
  return `${lane.label} · ${stage.label}\nProcesso: ${process}${observed ? `\nValor: ${observed}` : ""}\nFiltro Calendar[Date]: ${selectedDate.value}\nEstoque/logística: ${stock}${stockObserved ? `\nValor: ${stockObserved}` : ""}\n${mapping.evidence}`;
}
function formatMeasureDetailed(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 8 }); }
function stageMeasureLabel(lane: ClientProcessLane, stage: PositionedClientStage) {
  const mapping = mappingFor(lane, stage);
  if (!mapping?.participates) return "";
  return formatMeasureValues(mapping.processMeasureKeys, processMeasureValues.value);
}
function clientTotalDisplay(lane: ClientProcessLane) { const value=clientTotals.value[lane.key].value;return value===undefined?"—":formatProcessDays(value); }
async function loadLayoutMeasures() {
  try {
    const response = await fetch(`/api/layout/measures?date=${encodeURIComponent(selectedDate.value)}`, { cache: "no-store" });
    if (!response.ok) return;
    oracleMeasures.value = await response.json() as typeof oracleMeasures.value;
  } catch { /* A tela continua com a linhagem quando a API local está indisponível. */ }
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      Object.assign(fullscreenOrigin,{zoom:zoom.value,x:pan.x,y:pan.y});
      await layoutPage.value?.requestFullscreen();
    }
  } catch { ui.showError("O navegador não permitiu abrir o Layout em tela cheia."); }
}
async function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === layoutPage.value;
  await nextTick();
  if (isFullscreen.value) fitView();
  else { zoom.value=fullscreenOrigin.zoom; pan.x=fullscreenOrigin.x; pan.y=fullscreenOrigin.y; }
}
function removeSelected() { if (!selectedNode.value&&!selectedEdge.value&&!selectedNodeIds.value.length) return; if(selectedNodeIds.value.length>1){if(!window.confirm(`Remover os ${selectedNodeIds.value.length} blocos selecionados desta revisão?`))return;layout.deleteNodes(selectedNodeIds.value);selectedNodeIds.value=[];return;} const label=selectedNode.value?.label ?? "esta conexão"; if (!window.confirm(`Remover ${label} desta revisão?`)) return; layout.deleteSelected(); selectedNodeIds.value=[]; }
function duplicate() { layout.duplicateSelected(); panelOpen.value=true; }
function applyNode(id: string,label: string,properties: LayoutNodeProperties,processId?: string) { layout.applyNode(id,label,properties,processId);const capacity=processId?forms.capacityRows.find((row)=>row.id===processId):undefined;if(capacity)Object.assign(capacity,{process:label,cycleTimeSeconds:properties.cycleTimeSeconds,targetWipPieces:properties.wipPieces,referenceCapacityPerDay:properties.capacityPerDay,shifts:properties.shifts,efficiencyPercent:properties.availabilityPercent}); }
async function saveLayout() { layout.save(); forms.save(); await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout",savedAt:activeRevision.value.savedAt,parametersSavedAt:forms.savedAt}); }
async function createRevision() { layout.createRevision(); await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout-new-revision"}); }
function onKeydown(event: KeyboardEvent) { const target=event.target as HTMLElement; if (["INPUT","TEXTAREA","SELECT"].includes(target.tagName)) return; if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z") { event.preventDefault(); event.shiftKey?layout.redo():layout.undo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y") { event.preventDefault(); layout.redo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="d") { event.preventDefault(); duplicate(); } else if (["Delete","Backspace"].includes(event.key)) removeSelected(); }

onMounted(async()=>{layout.hydrate();forms.hydrate();operations.hydrate();selectedNodeIds.value=selectedNode.value?[selectedNode.value.id]:[];window.addEventListener("pointermove",onPointerMove,{passive:false});window.addEventListener("pointerup",endInteraction);window.addEventListener("keydown",onKeydown);document.addEventListener("fullscreenchange",onFullscreenChange);await loadLayoutMeasures();layoutMeasuresTimer=setInterval(()=>void loadLayoutMeasures(),30_000);await nextTick();fitView(true);if(typeof route.query.focus==="string")focusNode(route.query.focus);});
onBeforeUnmount(()=>{window.removeEventListener("pointermove",onPointerMove);window.removeEventListener("pointerup",endInteraction);window.removeEventListener("keydown",onKeydown);document.removeEventListener("fullscreenchange",onFullscreenChange);if(layoutMeasuresTimer)clearInterval(layoutMeasuresTimer);});
watch(()=>route.query.focus,async(focus)=>{if(typeof focus!=="string")return;await nextTick();focusNode(focus);});
</script>

<template>
  <div ref="layoutPage" class="layout-page" :class="{ 'is-fullscreen': isFullscreen }">
    <section class="layout-heading"><div class="breadcrumb"><strong>MIFC</strong><span>›</span><b>Layout</b><select class="revision-select" :value="activeRevision.id" @change="layout.switchRevision(($event.target as HTMLSelectElement).value)"><option v-for="revision in layout.revisions" :key="revision.id" :value="revision.id">{{ revision.label }}</option></select><span v-if="isDirty" class="dirty-dot">Alterações não salvas</span></div><div class="heading-actions"><label class="date-context"><span>Calendar[Date]</span><input v-model="selectedDate" type="date" @change="loadLayoutMeasures"/></label><button class="button button-secondary" type="button" @click="createRevision"><Plus :size="16"/>Nova revisão</button><button class="button button-primary" type="button" @click="saveLayout"><Save :size="16"/>Salvar layout<ChevronDown :size="14"/></button></div></section>
    <nav class="layout-toolbar" aria-label="Ferramentas do layout">
      <button :class="{active:activeTool==='select'}" @click="setTool('select')"><MousePointer2 :size="16"/>Selecionar</button><button :class="{active:activeTool==='connect'}" @click="chooseConnect('material_push')"><Waypoints :size="16"/>Conectar</button>
      <select v-model="activeFlow" aria-label="Tipo da conexão" @change="setTool('connect')"><option value="material_push">Material</option><option value="material_pull">Material puxado</option><option value="information">Informação</option><option value="electronic_information">Eletrônica</option></select>
      <button :class="{active:activeTool==='text'}" @click="setTool('text')"><TypeIcon :size="16"/>Texto</button><button @click="chooseConnect(activeFlow)"><Minus :size="16"/>Linha</button><button :class="{active:activeTool==='pan'}" @click="setTool('pan')"><Hand :size="16"/>Mover tela</button><span class="toolbar-separator"></span>
      <button :disabled="!undoStack.length" @click="layout.undo"><Undo2 :size="17"/>Desfazer</button><button :disabled="!redoStack.length" @click="layout.redo"><Redo2 :size="17"/>Refazer</button><span class="toolbar-separator"></span><button :disabled="!selectedNode" @click="duplicate"><Copy :size="16"/>Duplicar</button><button class="danger-tool" :disabled="!selectedNode&&!selectedEdge" @click="removeSelected"><Trash2 :size="16"/>Excluir</button>
      <div class="toolbar-spacer"></div><div class="layers-control"><button @click="showLayers=!showLayers"><Layers3 :size="16"/>Camadas</button><div v-if="showLayers" class="layers-popover"><label><input v-model="visibleLayers.information" type="checkbox"/>Fluxos de informação</label><label><input v-model="visibleLayers.material" type="checkbox"/>Fluxos de material</label><label><input v-model="visibleLayers.metrics" type="checkbox"/>Clientes / Lead Time</label></div></div><button @click="panelOpen=!panelOpen"><Eye :size="16"/>Exibir</button><button data-testid="fullscreen-toggle" @click="toggleFullscreen"><Minimize2 v-if="isFullscreen" :size="16"/><Maximize2 v-else :size="16"/>{{ isFullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}</button>
    </nav>
    <section class="editor-shell">
      <div ref="canvas" class="canvas-viewport" :class="[`tool-${activeTool}`, { 'is-panning': interaction.mode === 'pan' }]" data-testid="layout-canvas" @pointerdown.capture="onViewportPointerDown" @pointerdown.self="onCanvasPointerDown" @auxclick.prevent @wheel="onWheel">
        <MifcSymbolPalette @add="addSymbol" @flow="chooseConnect"/>
        <div class="canvas-world" :style="worldStyle" @pointerdown.self="onCanvasPointerDown">
          <svg class="edge-layer" :width="WORLD_WIDTH" :height="WORLD_HEIGHT" @pointerdown.self="onCanvasPointerDown">
            <defs><marker id="arrow-material" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1f2c38"/></marker><marker id="arrow-info" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#526170"/></marker></defs>
            <g v-for="edge in renderedEdges" v-show="isInformationEdge(edge)?visibleLayers.information:visibleLayers.material" :key="edge.id" class="edge-group" :class="[edge.flowType,{selected:selectedEdge?.id===edge.id}]" @click.stop="selectEdge(edge.id)"><path class="edge-hit" :d="edge.geometry.path"/><path class="edge-line" :d="edge.geometry.path" :marker-end="`url(#${isInformationEdge(edge)?'arrow-info':'arrow-material'})`"/><circle v-if="selectedEdge?.id===edge.id" class="curve-handle" :cx="edge.geometry.control.x" :cy="edge.geometry.control.y" r="8" @pointerdown="startCurve($event,edge)"/></g>
          </svg>
          <MifcNodeCard v-for="node in activeRevision.nodes" v-show="isInformationNode(node)?visibleLayers.information:visibleLayers.material" :key="node.id" :node="displayNode(node)" :zoom="zoom" :selected="selectedNodeIds.includes(node.id)" :primary="selectedNode?.id===node.id" :connecting="activeTool==='connect'" :live-metrics="liveMetricsForNode(node)" :action-summary="actionSummaryForNode(node)" @select="selectNode" @dragstart="startNodeDrag" @resizestart="startResize" @metricselect="nodeMetricTrace"/>
          <LayoutBufferCard v-for="buffer in positionedBuffers" v-show="visibleLayers.material" :key="buffer.id" :buffer="buffer" @select="(item) => openTrace(bufferTrace(item), item.id)" />
          <div v-if="visibleLayers.metrics" class="client-lead-time-board" data-testid="client-lead-time-board">
            <div class="client-board-title"><strong>Clientes / Lead Time</strong><span>Somente valores em dias · subida = processo · reta = sem processo</span><em class="parity-warning">Paridade Power BI parcial</em><em :class="{ connected: oracleMeasures.ready }">{{ oracleMeasures.ready ? `Filtro ${selectedDate} · ${filteredRowSummary.toLocaleString('pt-BR')} linhas · Oracle + parâmetros locais · ${oracleMeasures.updatedAt ? new Date(oracleMeasures.updatedAt).toLocaleTimeString('pt-BR') : 'atualizado'}` : 'Aguardando leitura das tabelas' }}</em></div>
            <div v-for="lane in clientLanes" :key="lane.key" class="client-lane" :data-client="lane.key" :data-testid="`client-lane-${lane.key}`">
              <div class="client-lane-label"><strong>{{ lane.label }}</strong></div>
              <svg :viewBox="`0 0 ${WORLD_WIDTH} 56`" :width="WORLD_WIDTH" height="56" role="img" :aria-label="`Linha de processos do cliente ${lane.label}`">
                <path class="client-process-line" :d="lane.path"/>
                <g v-for="stage in positionedClientStages" :key="stage.id" :class="['client-stage-marker', { active: mappingFor(lane,stage)?.participates, pending: mappingFor(lane,stage)?.validationStatus === 'pending' }]" :transform="`translate(${stage.centerX} 0)`">
                  <title>{{ mappingTitle(lane,stage) }}</title>
                  <circle :cy="mappingFor(lane,stage)?.participates ? 10 : 40" r="4.5"/>
                </g>
              </svg>
              <div class="client-measure-keys">
                <button v-for="stage in positionedClientStages" :key="stage.id" type="button" :aria-label="`Abrir origem de ${lane.label}, ${stage.label}`" :class="{ inactive: !mappingFor(lane,stage)?.participates, pending: mappingFor(lane,stage)?.validationStatus === 'pending' }" :style="{ left: `${stage.centerX}px` }" @click.stop="openTrace(stageTrace(lane,stage))">{{ stageMeasureLabel(lane,stage) }}</button>
              </div>
              <button class="client-total" type="button" :data-testid="`client-total-${lane.key}`" :aria-label="`Abrir tempo total do cliente ${lane.label}`" @click.stop="openTrace(totalTrace(lane))"><small>Tempo total do cliente</small><strong>{{ clientTotalDisplay(lane) }}</strong><em>{{ lane.totalMeasureKey }}</em></button>
            </div>
          </div>
        </div>
        <div class="canvas-status"><span v-if="connectSourceId">Agora selecione o bloco de destino</span><span v-else-if="selectedNodeIds.length>1">{{ selectedNodeIds.length }} blocos selecionados · mantenha Ctrl/Shift ao iniciar o arraste para mover o grupo</span><span v-else>{{ activeRevision.nodes.length }} blocos · arraste normal move somente um bloco · Ctrl/Shift seleciona o grupo</span></div><div class="zoom-controls"><button aria-label="Diminuir zoom" @click="setZoom(zoom-.1)"><Minus :size="16"/></button><span>{{ Math.round(zoom*100) }}%</span><button aria-label="Aumentar zoom" @click="setZoom(zoom+.1)"><Plus :size="16"/></button><button aria-label="Ajustar à tela" @click="fitView()"><Maximize2 :size="16"/></button></div>
      </div>
      <LayoutValueTracePanel v-if="panelOpen&&selectedTrace" :trace="selectedTrace" :editable-buffer="selectedBufferId ? forms.bufferRows.find((item) => item.id === selectedBufferId) : undefined" @close="selectedTrace=null;selectedBufferId=null" @update-buffer="updateBuffer" />
      <MifcPropertiesPanel v-else-if="panelOpen" :node="selectedNode" :edge="selectedEdge" :nodes="activeRevision.nodes" :edges="activeRevision.edges" :capacity-rows="forms.capacityRows" :focus-request="renameFocusRequest" @close="panelOpen=false" @update="applyNode" @delete="removeSelected" @update-edge="layout.updateSelectedEdge" @preview-label="layout.previewNodeLabel" @commit-label="layout.commitNodeLabel" @cancel-label="layout.cancelNodeLabel"/>
    </section>
  </div>
</template>

<style scoped>
.layout-page { display:flex; height:calc(100vh - var(--header-height)); min-height:690px; flex-direction:column; overflow:hidden; background:#fff; }
.layout-page:fullscreen,.layout-page.is-fullscreen { width:100vw; height:100vh; min-height:100vh; }
.layout-heading { display:flex; min-height:52px; align-items:center; justify-content:space-between; padding:0 18px; border-bottom:1px solid var(--border-subtle); }
.breadcrumb { display:flex; align-items:center; gap:10px; font-size:13px; }
.breadcrumb>b { color:var(--brand-blue-strong); }
.breadcrumb>span { color:var(--text-tertiary); }
.revision-select { height:27px; padding:0 25px 0 8px; border:1px solid var(--border-subtle); border-radius:999px; background:var(--surface-muted); color:var(--text-secondary); font-size:9px; }
.dirty-dot { display:flex; align-items:center; gap:5px; color:var(--warning); font-size:9px; }
.dirty-dot::before { width:6px; height:6px; border-radius:50%; background:var(--brand-orange); content:""; }
.heading-actions { display:flex; gap:8px; }
.heading-actions .button { min-height:36px; padding:0 13px; font-size:11px; }
.date-context { display:grid; gap:2px; color:var(--text-tertiary); font-size:8px; }
.date-context input { height:30px; padding:0 8px; border:1px solid var(--border-subtle); border-radius:5px; color:var(--text-secondary); font:inherit; font-size:10px; }
.layout-toolbar { position:relative; z-index:60; display:flex; min-height:48px; align-items:center; gap:3px; padding:0 14px; border-bottom:1px solid var(--border-subtle); background:#fff; }
.layout-toolbar button { display:flex; min-height:32px; align-items:center; gap:6px; padding:0 10px; border:1px solid transparent; border-radius:5px; background:transparent; color:#52627a; font-size:10px; }
.layout-toolbar button:hover:not(:disabled),.layout-toolbar button.active { border-color:#cfdbfb; background:var(--brand-blue-soft); color:var(--brand-blue-strong); }
.layout-toolbar button.active { background:var(--brand-blue); color:#fff; }
.layout-toolbar select { height:30px; border:1px solid var(--border-subtle); border-radius:5px; background:#fff; color:var(--text-secondary); font-size:9px; }
.toolbar-separator { width:1px; height:24px; margin:0 4px; background:var(--border-subtle); }
.toolbar-spacer { flex:1; }
.layout-toolbar .danger-tool:not(:disabled) { color:var(--danger); }
.layers-control { position:relative; }
.layers-popover { position:absolute; z-index:80; top:38px; right:0; display:grid; width:190px; gap:8px; padding:12px; border:1px solid var(--border-subtle); border-radius:8px; background:#fff; box-shadow:var(--shadow-float); font-size:10px; }
.layers-popover label { display:flex; align-items:center; gap:8px; }
.editor-shell { position:relative; display:flex; min-height:0; flex:1; }
.canvas-viewport { position:relative; min-width:0; flex:1; overflow:hidden; background-color:#fff; background-image:radial-gradient(#d8dee8 .8px,transparent .8px); background-size:14px 14px; touch-action:none; user-select:none; }
.canvas-viewport.tool-pan { cursor:grab; }
.canvas-viewport.is-panning { cursor:grabbing; }
.canvas-viewport.tool-connect,.canvas-viewport.tool-text { cursor:crosshair; }
.canvas-world { position:absolute; top:0; left:0; transform-origin:0 0; }
.edge-layer { position:absolute; z-index:1; inset:0; overflow:visible; }
.edge-line { fill:none; stroke:#1f2c38; stroke-width:1.6; }
.edge-hit { fill:none; stroke:transparent; stroke-width:15; cursor:pointer; }
.edge-group.information .edge-line { stroke:#526170; stroke-dasharray:6 5; }
.edge-group.electronic_information .edge-line { stroke:#526170; stroke-dasharray:2 5; }
.edge-group.material_pull .edge-line { stroke-dasharray:9 4; }
.edge-group.selected .edge-line { stroke:var(--brand-blue); stroke-width:3; }
.curve-handle { fill:#fff; stroke:var(--brand-blue); stroke-width:3; cursor:move; }
.client-lead-time-board { position:absolute; z-index:14; right:0; bottom:8px; left:0; height:330px; padding-top:42px; border-top:2px solid #d4dde8; background:rgba(255,255,255,.98); }
.client-board-title { position:absolute; top:5px; left:20px; display:flex; align-items:baseline; gap:10px; color:#263746; }
.client-board-title strong { font-size:16px; text-transform:uppercase; }
.client-board-title span { color:var(--text-tertiary); font-size:12px; }
.client-board-title em { margin-left:8px; color:#a66f00; font-size:11px; font-style:normal; }
.client-board-title em.connected { color:#15803d; }
.client-board-title em.parity-warning { padding:2px 6px; border:1px solid #f1c76d; border-radius:999px; background:#fff8e7; color:#9a6500; font-weight:700; }
.client-lane { position:relative; height:68px; border-top:1px solid #e4e9f0; }
.client-lane-label { position:absolute; z-index:3; top:14px; left:20px; display:grid; width:150px; }
.client-lane-label strong { color:#263746; font-size:16px; }
.client-lane-label small { color:var(--text-tertiary); font-size:12px; }
.client-lane svg { position:absolute; z-index:1; top:1px; left:0; overflow:visible; }
.client-process-line { fill:none; stroke:#263746; stroke-linejoin:miter; stroke-width:2; vector-effect:non-scaling-stroke; }
.client-stage-marker circle { fill:#fff; stroke:#98a4b4; stroke-width:1.5; }
.client-stage-marker.active circle { fill:#263746; stroke:#263746; }
.client-stage-marker.pending circle { fill:#fff4d6; stroke:#c88800; stroke-dasharray:2 1; }
.client-measure-keys { position:absolute; z-index:2; top:45px; right:0; left:0; height:22px; }
.client-measure-keys button { position:absolute; width:150px; min-height:20px; padding:1px 4px; border:0; border-radius:4px; background:rgba(255,255,255,.88); color:#263b52; font-size:11px; font-weight:700; line-height:1.15; text-align:center; white-space:normal; transform:translateX(-50%); cursor:pointer; }
.client-measure-keys button:hover,.client-measure-keys button:focus-visible { outline:0; background:var(--surface-selected); color:var(--brand-blue-strong); box-shadow:0 0 0 2px var(--focus-ring); }
.client-measure-keys button.inactive { color:#a1aab5; pointer-events:none; }
.client-measure-keys button.pending { color:#a66f00; }
.client-total { position:absolute; z-index:4; top:6px; right:22px; display:grid; min-width:158px; min-height:55px; align-content:center; padding:5px 11px; border:1px solid #aeb9c8; border-radius:7px; background:#fff; color:#20344c; text-align:left; box-shadow:0 2px 8px rgba(16,34,62,.08); cursor:pointer; }
.client-total:hover,.client-total:focus-visible { border-color:var(--brand-blue); outline:0; box-shadow:0 0 0 3px var(--focus-ring); }
.client-total small { font-size:7px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
.client-total strong { font-size:15px; }
.client-total em { color:var(--text-tertiary); font-size:7px; font-style:normal; }
.canvas-status { position:absolute; bottom:350px; left:15px; z-index:40; padding:7px 10px; border:1px solid var(--border-subtle); border-radius:6px; background:rgba(255,255,255,.94); color:var(--text-secondary); font-size:10px; box-shadow:var(--shadow-card); }
.zoom-controls { position:absolute; right:18px; bottom:350px; z-index:40; display:flex; align-items:center; border:1px solid var(--border-subtle); border-radius:7px; background:#fff; box-shadow:var(--shadow-card); }
.zoom-controls button { display:grid; width:34px; height:34px; place-items:center; border:0; border-left:1px solid var(--border-subtle); background:#fff; }
.zoom-controls button:first-child { border-left:0; }
.zoom-controls span { width:52px; color:var(--text-secondary); font-size:9px; text-align:center; }
@media(max-width:1120px) { .layout-toolbar button { padding-inline:8px; } }
@media(max-width:760px) { .layout-page { height:calc(100vh - 64px); } .layout-heading { align-items:flex-start; gap:8px; padding:9px 12px; } .breadcrumb { flex-wrap:wrap; } .layout-toolbar { overflow-x:auto; } .canvas-status,.client-lead-time-board { display:none; } }
</style>
