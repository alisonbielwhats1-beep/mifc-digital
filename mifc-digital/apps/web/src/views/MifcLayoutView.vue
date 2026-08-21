<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { Activity, ChevronDown, Copy, Eye, Focus, Hand, Layers3, LayoutGrid, Maximize2, Minimize2, Minus, MousePointer2, Plus, RefreshCw, Redo2, Save, ShieldCheck, Trash2, Type as TypeIcon, Undo2, Waypoints } from "@lucide/vue";
import type { MifcFlowType } from "@mifc/domain";
import { automaticCycleTimeStatus, calculateAutomaticCycleTimeSeconds, cycleTimeStatusLabel, type CycleTimeStatus } from "@/domain/cycle-time";
import MifcNodeCard from "@/components/layout/MifcNodeCard.vue";
import MifcPropertiesPanel from "@/components/layout/MifcPropertiesPanel.vue";
import MifcSymbolPalette from "@/components/layout/MifcSymbolPalette.vue";
import LayoutBufferCard from "@/components/layout/LayoutBufferCard.vue";
import LayoutMeasureBufferCard from "@/components/layout/LayoutMeasureBufferCard.vue";
import LayoutValueTracePanel from "@/components/layout/LayoutValueTracePanel.vue";
import { buildClientProcessPath, clientProcessLanes, clientProcessStages, mappingForClientStage, positionClientLaneMeasures, positionClientStages, type ClientProcessLane, type ClientStageMapping, type PositionedClientLaneMeasure, type PositionedClientStage } from "@/domain/client-process-matrix";
import { positionLayoutBuffers, type PositionedLayoutBuffer } from "@/domain/layout-buffers";
import { buildLayoutMeasureBuffers, type LayoutMeasureBufferValue, type PositionedLayoutMeasureBuffer } from "@/domain/layout-measure-buffers";
import { edgeGeometry } from "@/domain/layout-graph";
import { beginNodePointerSelection, finishNodePointerSelection } from "@/domain/layout-selection";
import { calculateLayoutProcessMeasures, formatMeasureValues, formatProcessDays } from "@/domain/layout-process-measures";
import { calculateClientTotal, type LayoutValueTrace } from "@/domain/layout-value-lineage";
import type { CalculationLineageNode, MeasureLineageEntry } from "@/domain/measure-lineage";
import { OPERATIONAL_TIME_ZONE, POWER_BI_TIMEZONE_OFFSET_MINUTES, calculateCalendarDayMinutes, calculateNetAvailableMinutes } from "@/domain/operational-clock";
import { useMifcFormsStore, type BufferFormRow, type CapacityFormRow, type LogisticsFormRow, type VolumeFormRow } from "@/stores/mifc-forms";
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
const panelOpen = ref(false);
const renameFocusRequest = ref(0);
const showLayers = ref(false);
const visibleLayers = reactive({ information: false, material: true, metrics: false, buffers: false });
const activeFlow = ref<MifcFlowType>("material_push");
const selectedNodeIds = ref<string[]>([]);
const selectedTrace = ref<LayoutValueTrace | null>(null);
const selectedBufferId = ref<string | null>(null);
const selectedVolumeId = ref<string | null>(null);
const selectedLogisticsId = ref<string | null>(null);
const selectedCapacityId = ref<string | null>(null);
const suppressNextNodeClick = ref(false);
type MeasureDiagnostics = {
  contextDate: string;
  rows: Record<string, { cached: number; filtered: number }>;
  operationalRows?: Record<string, number>;
  operationalReady?: Record<string, boolean>;
};
const todayKey = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; };
const selectedDate = ref(todayKey());
const operationalNow = ref(new Date());
const oracleMeasures = ref<{ ready: boolean; values: Record<string, number> | null; diagnostics?: MeasureDiagnostics; updatedAt: string | null }>({ ready: false, values: null, updatedAt: null });
const measureLineage = ref<Record<string, MeasureLineageEntry>>({});
let layoutMeasuresTimer: ReturnType<typeof setInterval> | undefined;
let operationalClockTimer: ReturnType<typeof setInterval> | undefined;
const interaction = reactive({ mode: "" as ""|"drag"|"resize"|"curve"|"pan", id: "", pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, originWidth: 0, originHeight: 0, originCurve: 0, horizontal: true, recorded: false, toggleOffOnClick: false, groupOrigins: {} as Record<string,{x:number;y:number}> });

const nodesById = computed(() => new Map(activeRevision.value.nodes.map((node) => [node.id,node])));
const renderedEdges = computed(() => activeRevision.value.edges.map((edge) => {
  const source = nodesById.value.get(edge.sourceNodeId); const target = nodesById.value.get(edge.targetNodeId);
  return source && target ? { ...edge, geometry: edgeGeometry(source,target,edge.curveOffset) } : null;
}).filter((edge): edge is NonNullable<typeof edge> => Boolean(edge)));
const positionedClientStages = computed(() => positionClientStages(activeRevision.value.nodes));
const clientLanes = computed(() => {
  const beneficiator = activeRevision.value.nodes.find((node) => node.id === "node-beneficiator" || node.id.endsWith("-node-beneficiator"));
  const finished = activeRevision.value.nodes.find((node) => node.id === "node-finished" || node.id.endsWith("-node-finished"));
  const lineStart = beneficiator ? beneficiator.x + beneficiator.width / 2 : undefined;
  const lineEnd = finished ? finished.x + finished.width / 2 : undefined;
  return clientProcessLanes.map((lane) => ({
    ...lane,
    path: buildClientProcessPath(lane, positionedClientStages.value, 40, 10, lineStart, lineEnd),
    measures: positionClientLaneMeasures(lane, positionedClientStages.value, activeRevision.value.nodes),
  }));
});
const availableMinutes = (capacityId: string) => (forms.capacityRows.find((row) => row.id === capacityId)?.availableHoursPerDay ?? 0) * 60;
const calendarDayMinutes = computed(() => calculateCalendarDayMinutes({ selectedDate: selectedDate.value, now: operationalNow.value }));
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
const lineageCapacityKeys: Record<string, string> = {
  "T-P-M-RF3": "cap-rf3", "T-P-M-B1": "cap-beatty", "T-P-M-B2": "cap-beatty-2", "T-P-M-B3": "cap-beatty-3", "T-P-M-B4": "cap-beatty-4",
  "T-P-M-LCT": "cap-lct", "T-P-M-P.A": "cap-pa", "T-P-M-CNC": "cap-cnc", "T-P-M-LPP2": "cap-paint", "T-P-M-STJ": "cap-stenhoj",
};
const lineageValues = computed<Record<string, number>>(() => {
  const values: Record<string, number> = { ...(oracleMeasures.value.values ?? {}), ...processMeasureValues.value, "T-T": 4 / 24, "T-M": 5 / 1_440 };
  for (const [measure, capacityId] of Object.entries(lineageCapacityKeys)) values[measure] = availableMinutes(capacityId);
  return values;
});
const positionedBuffers = computed(() => positionLayoutBuffers(forms.bufferRows, activeRevision.value.nodes));
const positionedMeasureBuffers = computed(() => buildLayoutMeasureBuffers(activeRevision.value.nodes, oracleMeasures.value.values));
const clientTotals = computed(() => Object.fromEntries(clientProcessLanes.map((lane) => {
  const logistics = forms.logisticsRows.find((row) => row.customer === lane.label && row.status === "active");
  return [lane.key, calculateClientTotal(lane.key, oracleMeasures.value.values, {
    transportHours: logistics?.transportHours,
    beneficiatorDays: logistics?.beneficiatorDays,
    movementMinutes: logistics?.movementMinutes,
    processValues: processMeasureValues.value,
  })];
})) as Record<ClientProcessLane["key"], ReturnType<typeof calculateClientTotal>>);
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
function processLineageSteps(keys: string[]): CalculationLineageNode[] {
  return keys.map((key) => {
    const config = processTraceConfig[key];
    const capacityMeasure = config?.capacityId ? Object.entries(lineageCapacityKeys).find(([, capacityId]) => capacityId === config.capacityId)?.[0] : undefined;
    const minutes = config?.capacityId ? availableMinutes(config.capacityId) : undefined;
    const demand = config?.demandKey ? oracleMeasures.value.values?.[config.demandKey] : undefined;
    const result = processMeasureValues.value[key];
    const children: CalculationLineageNode[] = [];
    if (key === "T-M3") {
      children.push({ id: `${key}-constant`, key, label: "Constante do modelo", description: "A Mesa 3 está explicitamente marcada como zero no modelo semântico atual.", formula: "0", value: 0, unit: "dias", origin: "CONSTANTE", children: [] });
    } else if (key === "T-EMB-VM") {
      children.push({ id: `${key}-demand`, key: config?.demandKey, label: "Produção média diária Volvo VM", description: "A embalagem VM usa a cadência média filtrada como denominador.", value: demand, unit: "peças/dia", origin: "ORACLE_MES", children: [] });
      children.push({ id: `${key}-constant`, label: "Numerador da conversão", description: "Uma unidade de produção corresponde a 1 ÷ cadência diária.", formula: "1", value: 1, unit: "unidade", origin: "CONSTANTE", children: [] });
    } else {
      children.push({ id: `${key}-minutes`, key: capacityMeasure, label: "Tempo disponível da máquina", description: "Horas disponíveis por dia do cadastro de capacidade convertidas para minutos.", formula: "horas disponíveis/dia × 60", value: minutes, unit: "min/dia", origin: "CAPACIDADE", children: [] });
      children.push({ id: `${key}-demand`, key: config?.demandKey, label: "Demanda filtrada", description: `Demanda da etapa para ${selectedDate.value}, respeitando o contexto de data e cliente.`, value: demand, unit: config?.demandKey === "P-M-VM" ? "peças/dia" : "peças", origin: "ORACLE_MES", children: [] });
      children.push({ id: `${key}-day`, label: "Conversão de minutos para dias", description: "Depois de dividir o tempo disponível pela demanda, o resultado é convertido pela duração do dia.", formula: "÷ 1.440 minutos/dia", value: 1_440, unit: "min/dia", origin: "CONSTANTE", children: [] });
    }
    return {
      id: `process-lineage-${key}`,
      key,
      label: `${key} · resultado da etapa`,
      description: "Medida de tempo de processo apresentada no Layout.",
      formula: config?.formula ?? "Regra catalogada no modelo semântico.",
      value: result,
      unit: "dias",
      origin: "CALCULATED",
      children,
    };
  });
}
const productionKeys: Record<string, { production: string[]; demand: string[]; stops: string[] }> = {
  "T-RF3": { production: ["P-RF3"], demand: ["D-P-RF3"], stops: ["P-P-RF3"] },
  "T-B1": { production: ["P-B1"], demand: ["D-P-B1"], stops: ["P-P-B1"] },
  "T-B2": { production: ["P-B2"], demand: ["D-P-B2"], stops: ["P-P-B2"] },
  "T-B3": { production: ["P-B3"], demand: ["D-P-B3"], stops: ["P-P-B3"] },
  "T-B4": { production: ["P-B4"], demand: ["D-P-B4"], stops: ["P-P-B4"] },
  "T-P.A": { production: ["P-P.A"], demand: ["D-P-P.A"], stops: ["P-P-P.A"] },
  "T-CNC": { production: ["P-CNC"], demand: ["D-P-CNC"], stops: ["P-P-CNC"] },
  "T-LPP2": { production: ["P-LPP2"], demand: ["D-P-LPP2"], stops: ["P-P-LPP2"] },
  "T-STJ": { production: ["P-STJ"], demand: ["D-P-STJ"], stops: ["P-P-STJ"] },
};
const netAvailableMeasureKeys: Record<string, string> = {
  "T-RF3": "T-D-L-RF3",
  "T-B1": "T-D-L-B1",
  "T-B2": "T-D-L-B2",
  "T-B3": "T-D-L-B3",
  "T-B4": "T-D-L-B4",
  "T-P.A": "T-D-L-P.A",
  "T-CNC": "T-D-L-CNC",
  "T-LPP2": "T-D-L-LPP2",
  "T-STJ": "T-D-L-STJ",
};
function sumMeasureKeys(keys: string[]): number { return keys.reduce((total, key) => total + Number(oracleMeasures.value.values?.[key] ?? 0), 0); }
function liveMetricsForNode(node: LayoutNode) {
  const keys = productionKeys[node.properties.calculationKey];
  if (!keys || !oracleMeasures.value.diagnostics?.operationalReady?.producao) return undefined;
  const stopsReady = Boolean(oracleMeasures.value.diagnostics.operationalReady.paradas);
  const stopMinutes = stopsReady ? sumMeasureKeys(keys.stops) : undefined;
  return {
    production: sumMeasureKeys(keys.production),
    demand: sumMeasureKeys(keys.demand),
    calendarMinutes: calendarDayMinutes.value,
    stopMinutes,
    netAvailableMinutes: keys.stops.length === 1
      ? calculateNetAvailableMinutes({ calendarMinutes: calendarDayMinutes.value, programmedStopMinutes: stopMinutes })
      : undefined,
  };
}
function cycleMetricsForNode(node: LayoutNode): { mode: "manual" | "automatic"; value?: number; status: CycleTimeStatus; statusLabel: string; unit: string; production?: number; availableMinutes?: number } {
  const capacity = node.processId ? forms.capacityRows.find((row) => row.id === node.processId) : undefined;
  const mode = capacity?.cycleTimeMode ?? node.properties.cycleTimeMode ?? "manual";
  const manualSeconds = capacity?.cycleTimeSeconds ?? node.properties.cycleTimeSeconds;
  const metrics = liveMetricsForNode(node);
  if (mode === "manual") return { mode, value: manualSeconds || undefined, status: manualSeconds ? "ready" : "waiting_source", statusLabel: manualSeconds ? "Valor manual" : "Sem valor manual", unit: "s/unid.", production: metrics?.production, availableMinutes: metrics?.netAvailableMinutes };
  const sourceConfigured = Boolean(productionKeys[node.properties.calculationKey]);
  const value = calculateAutomaticCycleTimeSeconds({ availableMinutes: metrics?.netAvailableMinutes, productionCount: metrics?.production });
  const status = automaticCycleTimeStatus({ sourceConfigured, availableMinutes: metrics?.netAvailableMinutes, productionCount: metrics?.production });
  return { mode, value, status, statusLabel: cycleTimeStatusLabel(status), unit: "s/unid. técnica", production: metrics?.production, availableMinutes: metrics?.netAvailableMinutes };
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
const machineNodes = computed(() => activeRevision.value.nodes.filter((node) => node.type === "process"));
const machineFocusActive = computed(() => visibleLayers.material && !visibleLayers.information && !visibleLayers.metrics && !visibleLayers.buffers);
const fullLayoutActive = computed(() => visibleLayers.material && visibleLayers.information && visibleLayers.metrics && visibleLayers.buffers);
const machineReadiness = computed(() => {
  const metrics = machineNodes.value.map((node) => cycleMetricsForNode(node));
  return {
    total: metrics.length,
    ready: metrics.filter((item) => item.status === "ready").length,
    automatic: metrics.filter((item) => item.mode === "automatic").length,
    pending: metrics.filter((item) => item.status !== "ready").length,
  };
});
const visibleBounds = computed(() => {
  const nodes = activeRevision.value.nodes.filter((node) => {
    if (machineFocusActive.value) return ["process", "storage", "truck"].includes(node.type);
    return isInformationNode(node) ? visibleLayers.information : visibleLayers.material;
  });
  const fallback = { x: 500, y: 350, width: 2_200, height: 700 };
  if (!nodes.length) return fallback;
  const padding = machineFocusActive.value ? 150 : 70;
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height), visibleLayers.metrics ? WORLD_HEIGHT - 8 : 0);
  return { x: Math.max(0, minX - padding), y: Math.max(0, minY - padding), width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 };
});
function isNodeVisible(node: LayoutNode) {
  if (machineFocusActive.value) return ["process", "storage", "truck"].includes(node.type);
  return isInformationNode(node) ? visibleLayers.information : visibleLayers.material;
}
function isEdgeVisible(edge: LayoutEdge) { return isInformationEdge(edge) ? visibleLayers.information : visibleLayers.material; }
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
      cycleTimeMode: capacity.cycleTimeMode,
    },
  };
}
function processTimesForNode(node: LayoutNode) {
  const stage = clientProcessStages.find((item) => node.id === item.layoutNodeId || node.id.endsWith(`-${item.layoutNodeId}`));
  if (!stage) return [];
  const keys = new Set<string>();
  for (const lane of clientProcessLanes) {
    const mapping = mappingForClientStage(lane, stage);
    if (mapping?.participates) mapping.processMeasureKeys.forEach((key) => keys.add(key));
  }
  return [...keys].map((key) => ({ key, value: processMeasureValues.value[key] }));
}
function manualValuesForNode(node: LayoutNode) {
  if (!(node.id === "node-beneficiator" || node.id.endsWith("-node-beneficiator"))) return [];
  return clientProcessLanes.map((lane) => ({
    label: lane.key,
    value: forms.logisticsRows.find((row) => row.customer === lane.label && row.status === "active")?.beneficiatorDays,
  }));
}
function setTool(tool: LayoutTool) { layout.setTool(tool); showLayers.value = false; }
function chooseConnect(flow: MifcFlowType) { activeFlow.value = flow; layout.setTool("connect"); }
function worldCenter() { const rect = canvas.value?.getBoundingClientRect(); return { x:((rect?.width ?? 1000)/2-pan.x)/zoom.value, y:((rect?.height ?? 700)/2-pan.y)/zoom.value }; }
function worldPoint(event: PointerEvent) { const rect = canvas.value!.getBoundingClientRect(); return { x:(event.clientX-rect.left-pan.x)/zoom.value, y:(event.clientY-rect.top-pan.y)/zoom.value }; }
function addSymbol(type: LayoutNodeType, label?: string) { const point = worldCenter(); layout.addNode(type,point.x-55,point.y-35,label); selectedTrace.value=null; panelOpen.value = true; }
function clearSelection() { selectedNodeIds.value=[]; selectedTrace.value=null; selectedBufferId.value=null; selectedVolumeId.value=null; selectedLogisticsId.value=null; selectedCapacityId.value=null; layout.selectNode(null); layout.selectEdge(null); panelOpen.value=false; }
function closePanel() { clearSelection(); }
function openTrace(trace: LayoutValueTrace, bufferId?: string, capacityId?: string) { selectedTrace.value=trace;selectedBufferId.value=bufferId??null;selectedVolumeId.value=null;selectedLogisticsId.value=null;selectedCapacityId.value=capacityId??null;panelOpen.value=true; }
function operationalClockTrace(): LayoutValueTrace {
  const isToday = calendarDayMinutes.value !== 1_440;
  const currentTime = operationalNow.value.toLocaleString("pt-BR", { timeZone: OPERATIONAL_TIME_ZONE });
  return {
    id: "calendar-dia-min",
    title: "Relógio operacional — Calendar[Dia_Min]",
    displayValue: calendarDayMinutes.value.toLocaleString("pt-BR"),
    unit: "min",
    formula: "Calendar[Dia_Min] = IF(Date = TODAY(), HOUR(NOW()) × 60 + MINUTE(NOW()), 1.440)",
    simpleExplanation: isToday
      ? "Para o dia atual, o relógio avança automaticamente conforme o horário da planta. Esta medida é separada dos minutos planejados da tabela Máquinas."
      : "Como a data selecionada não é hoje, a regra do Power BI considera o dia completo com 1.440 minutos.",
    inputs: [
      { key: "Calendar[Date]", label: "Data selecionada", textValue: selectedDate.value, unit: "data", origin: "INPUT" },
      { key: "NOW()", label: "Relógio da planta", textValue: currentTime, unit: OPERATIONAL_TIME_ZONE, origin: "CALCULATED" },
    ],
    intermediateResults: [`Calendar[Dia_Min] = ${calendarDayMinutes.value.toLocaleString("pt-BR")} min`],
    origin: "CALCULATED — relógio local no fuso da planta",
    measureKeys: ["Calendar[Dia_Min]", "T-D"],
    filters: [`Calendar[Date] = ${selectedDate.value}`, `Fuso = ${OPERATIONAL_TIME_ZONE}`],
    date: selectedDate.value,
    updatedAt: operationalNow.value.toISOString(),
    sourceReference: "MIFC.SemanticModel/definition/tables/Calendar.tmdl",
    missingKeys: [],
  };
}
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
    lineageSteps: processLineageSteps(processKeys),
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
function totalLineageSteps(total: ReturnType<typeof calculateClientTotal>): CalculationLineageNode[] {
  const groups = [
    { id: "manual", label: "1. Entradas manuais convertidas para dias", description: "Transporte, Beneficiador e movimentação entram no total com suas conversões de unidade.", inputs: total.inputs.filter((input) => input.origin === "INPUT"), origin: "INPUT manual" },
    { id: "stock", label: "2. Estoques e esperas do fluxo", description: "Cada buffer ou espera é somado uma vez, respeitando o cliente e os filtros da medida.", inputs: total.inputs.filter((input) => input.origin === "STOCK"), origin: "Medida Power BI — estoque/espera" },
    { id: "process", label: "3. Tempos de máquina participantes", description: "Os tempos das máquinas participantes entram como parcelas independentes; subtotais de ENN não são duplicados.", inputs: total.inputs.filter((input) => input.origin === "PROCESS"), origin: "Tempo de máquina calculado" },
  ];
  const nodes: CalculationLineageNode[] = groups.filter((group) => group.inputs.length).map((group) => ({
    id: `total-lineage-${group.id}`,
    label: group.label,
    description: group.description,
    value: group.inputs.every((input) => input.value !== undefined) ? group.inputs.reduce((sum, input) => sum + Number(input.value) * input.multiplier, 0) : undefined,
    unit: "dias",
    origin: group.origin,
    children: group.inputs.map((input) => ({
      id: `total-lineage-${group.id}-${input.key}`,
      key: input.key,
      label: input.label,
      description: input.multiplier > 1 ? `Parcela aplicada ${input.multiplier} vezes na composição do cliente.` : "Parcela aplicada uma vez na composição do cliente.",
      formula: input.multiplier > 1 ? `[${input.key}] × ${input.multiplier}` : `[${input.key}]`,
      value: input.value === undefined ? undefined : input.value * input.multiplier,
      textValue: input.value !== undefined && input.multiplier > 1 ? `${input.value} × ${input.multiplier}` : undefined,
      unit: "dias",
      origin: input.origin,
      children: [],
    })),
  }));
  nodes.push({
    id: "total-lineage-final",
    label: "4. Soma final do Lead Time funcional",
    description: "O valor exibido é a soma dos três blocos acima, sem preencher parcelas ausentes com zero.",
    formula: total.formula,
    value: total.value,
    unit: "dias",
    origin: "RESULTADO FINAL",
    children: [],
  });
  return nodes;
}
function totalTrace(lane: ClientProcessLane): LayoutValueTrace {
  const total = clientTotals.value[lane.key];
  return {
    id: `total-${lane.key}`,
    title: `Tempo total do cliente — ${lane.label}`,
    displayValue: total.value === undefined ? "—" : formatProcessDays(total.value),
    unit: "dias",
    formula: `${total.measureKey} = ${total.formula}`,
    simpleExplanation: total.value === undefined ? "O total funcional exige os três parâmetros manuais, todos os estoques e cada tempo de máquina da rota. Se uma parcela faltar, nenhuma soma parcial é apresentada como total." : `O total de ${lane.label} soma transporte, Beneficiador, ${total.inputs.find((input) => input.key === "T-M")?.multiplier} movimentações, estoques/esperas e cada máquina participante uma única vez. CC, Furação, Pintura e SEE não são somados novamente como subtotais de ENN.`,
    inputs: total.inputs.map((input) => ({ key: input.key, label: input.label, value: input.value === undefined ? undefined : input.value * input.multiplier, textValue: input.value !== undefined && input.multiplier > 1 ? `${input.value} × ${input.multiplier}` : undefined, unit: "dias", origin: input.origin === "INPUT" ? "INPUT manual" : input.origin === "PROCESS" ? "Tempo de máquina calculado" : "Medida Power BI — estoque/espera" })),
    intermediateResults: total.inputs.map((input) => `${input.key}${input.multiplier > 1 ? ` × ${input.multiplier}` : ""} = ${input.value === undefined ? "—" : formatMeasureDetailed(input.value * input.multiplier)} dia`),
    lineageSteps: totalLineageSteps(total),
    origin: "MIXED — parâmetros manuais + medidas Power BI reproduzidas localmente",
    measureKeys: [total.measureKey, ...total.inputs.map((input) => input.key)],
    filters: [`Calendar[Date] = ${selectedDate.value}`, `Cliente = ${lane.label}`, "Sem subtotal duplicado de ENN"],
    client: lane.label,
    date: selectedDate.value,
    updatedAt: oracleMeasures.value.updatedAt,
    sourceReference: total.sourceReference,
    missingKeys: total.missingKeys,
  };
}
function measureBufferTrace(buffer: PositionedLayoutMeasureBuffer, entry: LayoutMeasureBufferValue): LayoutValueTrace {
  const isSlitter = ["Q-D-FH", "Q-D-VM", "Q-D-SCA", "Q-D-DAF"].includes(entry.measureKey);
  const isSegregation = entry.measureKey.startsWith("Q-D-S-");
  const piecesKey = `E-M-P-S-${entry.clientKey}`;
  const rateKey = `P-M-${entry.clientKey}`;
  const slitterRateValueKey = `P-M-SLITTER-${entry.clientKey}`;
  const slitterAverageValueKey = `C-P-M-TOTAL-${entry.clientKey}`;
  const value = entry.value;
  return {
    id: `measure-buffer-${buffer.id}-${entry.measureKey}`,
    title: `${buffer.label} · ${entry.clientLabel}`,
    displayValue: value === undefined ? "—" : formatProcessDays(value),
    unit: "dias",
    formula: isSlitter
      ? `${entry.measureKey} = [${piecesKey}] ÷ [${rateKey}]; ${piecesKey} = ROUNDDOWN([C-T-E do grupo] ÷ [C-P-M-TOTAL], 0)`
      : isSegregation
        ? entry.measureKey === "Q-D-S-T"
          ? "Q-D-S-T = Q-D-S-EMB + Q-D-S-LPP2 + Q-D-S-RF2 + Q-D-S-RF3 + Q-D-S-STJ"
          : `${entry.measureKey} = peças segregadas no processo ÷ demanda diária aplicável`
        : `${entry.measureKey} = estoque/WIP do ponto ÷ cadência diária do cliente, conforme a medida catalogada no Power BI`,
    simpleExplanation: isSlitter
      ? "O Slitter converte o peso dos lotes em metros com densidade 7.850 kg/m³, divide pelo comprimento médio ponderado das peças nas quatro fontes de Slitter, arredonda as peças para baixo e divide pela cadência diária do cliente. A tabela Produção não participa."
      : isSegregation
        ? "Estoque segregado do processo convertido em dias pela mesma demanda usada no Power BI. O total soma os cinco pontos segregados sem misturá-los aos estoques por cliente."
        : "Este valor automático permanece no símbolo de buffer da máquina correspondente e não é misturado ao tempo de processamento do card da máquina.",
    inputs: isSlitter ? [
      { key: "C-T-E", label: "Comprimento total dos lotes", value: oracleMeasures.value.values?.["C-T-E"], unit: "m", origin: "ORACLE_MES + DAX MP(m)" },
      { key: "C-P-M-TOTAL", label: "Comprimento médio no Slitter", value: oracleMeasures.value.values?.[slitterAverageValueKey] ?? oracleMeasures.value.values?.["C-P-M-TOTAL"], unit: "m/peça", origin: "ORACLE_MES + Power BI" },
      { key: piecesKey, label: "Estoque médio em peças", value: oracleMeasures.value.values?.[piecesKey], unit: "peças", origin: "CALCULATED" },
      { key: rateKey, label: "Cadência diária no contexto MP[Cliente]", value: oracleMeasures.value.values?.[slitterRateValueKey] ?? oracleMeasures.value.values?.[rateKey], unit: "peças/dia", origin: "Power BI" },
    ] : [{ key: entry.measureKey, label: buffer.label, value, unit: "dias", origin: "ORACLE_MES + Power BI" }],
    intermediateResults: isSlitter ? [
      "MP(m) = (PESO ÷ 7.850) ÷ ((ESPESSURA ÷ 1.000) × (LARGURA ÷ 1.000))",
      `${piecesKey} = ${oracleMeasures.value.values?.[piecesKey] === undefined ? "—" : oracleMeasures.value.values[piecesKey].toLocaleString("pt-BR")} peças`,
      `${entry.measureKey} = ${value === undefined ? "—" : formatMeasureDetailed(value)} dia`,
    ] : [],
    origin: "Oracle/MES somente leitura + medida Power BI reproduzida",
    measureKeys: isSlitter ? [entry.measureKey, piecesKey, "C-T-E", "C-P-M-TOTAL", rateKey] : [entry.measureKey],
    filters: [`Calendar[Date] = ${selectedDate.value}`, ...(entry.clientKey === "ALL" ? ["Contexto = compartilhado / processo"] : [`Cliente = ${entry.clientLabel}`]), `Buffer = ${buffer.label}`],
    client: entry.clientKey === "ALL" ? undefined : entry.clientLabel,
    process: buffer.label,
    date: selectedDate.value,
    updatedAt: oracleMeasures.value.updatedAt,
    sourceReference: "MIFC.SemanticModel/definition/tables/1-Measure.tmdl + Lotes.tmdl",
    missingKeys: value === undefined ? [entry.measureKey] : [],
  };
}
function clientVolumeRow(lane: ClientProcessLane) {
  return forms.volumeRows.find((row) => row.customer === lane.label);
}
function clientParameterTrace(lane: ClientProcessLane): LayoutValueTrace {
  const volume = clientVolumeRow(lane);
  const logistics = forms.logisticsRows.find((row) => row.customer === lane.label && row.status === "active");
  const pairsPerDay = volume ? volume.vehiclesPerDay * (1 + volume.reinforcementPercent / 100) : undefined;
  return {
    id: `client-${lane.key}`,
    title: `Parâmetros do cliente · ${lane.label}`,
    displayValue: pairsPerDay === undefined ? "—" : pairsPerDay.toLocaleString("pt-BR", { maximumFractionDigits: 3 }),
    unit: "pares/dia",
    formula: "Pares/dia = veículos/dia × (1 + reforço % ÷ 100)",
    simpleExplanation: volume ? `${volume.vehiclesPerDay.toLocaleString("pt-BR")} veículos por dia, acrescidos de ${volume.reinforcementPercent.toLocaleString("pt-BR")}% de reforços, resultam em ${pairsPerDay?.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} pares por dia. Esse ritmo alimenta os buffers do cliente.` : "O cliente não possui uma linha de Volume vinculada; nenhum ritmo foi presumido.",
    inputs: [...(volume ? [
      { key: "vehiclesPerDay", label: "Veículos por dia", value: volume.vehiclesPerDay, unit: "veículos/dia", origin: "INPUT" },
      { key: "reinforcementPercent", label: "Reforço", value: volume.reinforcementPercent, unit: "%", origin: "INPUT" },
      { key: "workingDays", label: "Dias úteis", value: volume.workingDays, unit: "dias/ano", origin: "INPUT" },
      { key: "shifts", label: "Turnos", value: volume.shifts, unit: "turnos/dia", origin: "INPUT" },
    ] : []), ...(logistics ? [
      { key: "transportHours", label: "Transporte", value: logistics.transportHours, unit: "h", origin: "INPUT" },
      { key: "beneficiatorDays", label: "Beneficiador", value: logistics.beneficiatorDays, unit: "dias", origin: "INPUT" },
      { key: "movementMinutes", label: "Movimentação", value: logistics.movementMinutes, unit: "min", origin: "INPUT" },
    ] : [])],
    intermediateResults: volume && pairsPerDay !== undefined ? [`1 + ${volume.reinforcementPercent} ÷ 100 = ${(1 + volume.reinforcementPercent / 100).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}`, `${volume.vehiclesPerDay} × ${(1 + volume.reinforcementPercent / 100).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} = ${pairsPerDay.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} pares/dia`] : [],
    origin: "Valores manuais — Volume e Logística",
    measureKeys: [],
    filters: [`Cliente = ${lane.label}`, `Revisão = ${activeRevision.value.label}`],
    client: lane.label,
    date: selectedDate.value,
    updatedAt: forms.savedAt,
    sourceReference: "Cadastros Volume e Logística; regra funcional LT-TOTAL-*",
    missingKeys: [...(volume ? [] : ["Cadastro Volume"]), ...(logistics ? [] : ["Cadastro Logística"])],
  };
}
function openClient(lane: ClientProcessLane) {
  const row = clientVolumeRow(lane);
  selectedBufferId.value = null;
  selectedCapacityId.value = null;
  selectedVolumeId.value = row?.id ?? null;
  selectedLogisticsId.value = forms.logisticsRows.find((item) => item.customer === lane.label && item.status === "active")?.id ?? null;
  selectedTrace.value = clientParameterTrace(lane);
  panelOpen.value = true;
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
function productionMetricTrace(node: LayoutNode, metrics: ReturnType<typeof liveMetricsForNode>): LayoutValueTrace {
  const keys = productionKeys[node.properties.calculationKey];
  const netMeasureKey = netAvailableMeasureKeys[node.properties.calculationKey];
  const stopKey = keys?.stops.length === 1 ? keys.stops[0] : undefined;
  const inputs: LayoutValueTrace["inputs"] = [
    { key: "production", label: "Produção observada", value: metrics?.production, unit: "peças", origin: "ORACLE_MES" },
    { key: "demand", label: "Demanda", value: metrics?.demand, unit: "peças", origin: "ORACLE_MES" },
  ];
  if (netMeasureKey) {
    inputs.push(
      { key: "Calendar[Dia_Min]", label: "Relógio operacional", value: calendarDayMinutes.value, unit: "min", origin: "CALCULATED" },
      { key: stopKey ?? "P-P-*", label: "Paradas programadas", value: metrics?.stopMinutes, unit: "min", origin: "ORACLE_MES" },
      { key: "F-H", label: "Ajuste de fuso Power BI", value: POWER_BI_TIMEZONE_OFFSET_MINUTES, unit: "min", origin: "CONSTANT" },
      { key: netMeasureKey, label: "Tempo disponível líquido", value: metrics?.netAvailableMinutes, unit: "min", origin: "CALCULATED" },
    );
  }
  const missingKeys = metrics
    ? netMeasureKey && metrics.stopMinutes === undefined ? ["Cache Paradas"] : []
    : ["Cache Produção"];
  return {
    id: `${node.id}-production`,
    title: `${node.label} · Produção, demanda e relógio operacional`,
    displayValue: metrics ? `${metrics.production.toLocaleString("pt-BR")} / ${metrics.demand.toLocaleString("pt-BR")}` : "—",
    unit: "peças",
    formula: netMeasureKey
      ? `Produção observada / demanda filtrada | ${netMeasureKey} = Calendar[Dia_Min] - ${stopKey} - F-H`
      : "Produção observada / demanda filtrada conforme as medidas vinculadas ao processo.",
    simpleExplanation: metrics
      ? "Produção e demanda usam a mesma data. O disponível líquido combina o relógio Calendar[Dia_Min] com as paradas programadas do OMES e o ajuste F-H do modelo Power BI."
      : "Se o cache de Produção não estiver disponível, a tela mostra ausência em vez de zero.",
    inputs,
    intermediateResults: netMeasureKey ? [
      `Calendar[Dia_Min] = ${calendarDayMinutes.value.toLocaleString("pt-BR")} min`,
      `${stopKey} = ${metrics?.stopMinutes === undefined ? "—" : metrics.stopMinutes.toLocaleString("pt-BR")} min`,
      `F-H = ${POWER_BI_TIMEZONE_OFFSET_MINUTES} min`,
      `${netMeasureKey} = ${metrics?.netAvailableMinutes === undefined ? "—" : metrics.netAvailableMinutes.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} min`,
    ] : [],
    origin: "Oracle/MES somente leitura + relógio operacional calculado",
    measureKeys: keys ? [...keys.production, ...keys.demand, ...keys.stops, "Calendar[Dia_Min]", ...(netMeasureKey ? [netMeasureKey] : [])] : ["Calendar[Dia_Min]"],
    filters: [`Calendar[Date] = ${selectedDate.value}`, `Processo = ${node.label}`, `Fuso = ${OPERATIONAL_TIME_ZONE}`],
    process: node.label,
    date: selectedDate.value,
    updatedAt: oracleMeasures.value.updatedAt,
    sourceReference: "MIFC.SemanticModel/definition/tables/Calendar.tmdl; 1-Measure.tmdl; OMES Paradas somente leitura",
    missingKeys,
  };
}
function nodeMetricTrace(node: LayoutNode, metric: "cycle"|"capacity"|"production"|"process") {
  const effective = displayNode(node);
  const metrics = liveMetricsForNode(node);
  if (metric === "cycle") {
    const cycle = cycleMetricsForNode(node);
    const automatic = cycle.mode === "automatic";
    const formula = automatic
      ? "CT automático = (Calendar[Dia_Min] − paradas programadas − F-H) ÷ produção observada × 60"
      : "CT manual = valor informado no cadastro Capacidade";
    const inputs: LayoutValueTrace["inputs"] = [
      { key: "cycleTimeMode", label: "Modo de cálculo", textValue: automatic ? "Automático" : "Manual", unit: "", origin: "INPUT" },
      { key: "cycleTimeSeconds", label: "CT manual de reserva", value: effective.properties.cycleTimeSeconds || undefined, unit: "s/unid.", origin: "INPUT" },
    ];
    if (automatic) inputs.push(
      { key: "T-D-L", label: "Tempo disponível líquido", value: cycle.availableMinutes, unit: "min", origin: "CALCULATED" },
      { key: "P-*", label: "Produção observada", value: cycle.production, unit: "unid. técnica", origin: "ORACLE_MES" },
    );
    const missingKeys = automatic
      ? (cycle.status === "ready" ? [] : [cycle.status === "not_available" ? "Fonte de produção desta máquina" : "Tempo disponível líquido / produção"])
      : (effective.properties.cycleTimeSeconds > 0 ? [] : ["Tempo de Ciclo"]);
    openTrace({
      id: `${node.id}-ct`, title: `${node.label} · Tempo de Ciclo`, displayValue: cycle.value === undefined ? "—" : cycle.value.toLocaleString("pt-BR", { maximumFractionDigits: 3 }), unit: cycle.unit,
      formula, simpleExplanation: automatic
        ? `${cycle.statusLabel}. A conta reproduz a lógica de tempo disponível do Power BI; o denominador atual é o contador técnico do MES (RAIL_ID), ainda pendente de homologação como peça física.`
        : "Este é o valor manual de reserva. Ao trocar para Automático, o Layout passa a buscar produção e paradas do MES para a data selecionada.",
      inputs, intermediateResults: automatic ? [
        `Calendar[Dia_Min] − paradas programadas − F-H = ${cycle.availableMinutes === undefined ? "—" : `${cycle.availableMinutes.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} min`}`,
        `Produção observada = ${cycle.production === undefined ? "—" : cycle.production.toLocaleString("pt-BR")} unidade técnica`,
        `CT = ${cycle.value === undefined ? "—" : cycle.value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} s/unidade técnica`,
      ] : [],
      origin: automatic ? "Oracle/MES somente leitura + cálculo local" : "Valor manual / importado", measureKeys: automatic ? [node.properties.calculationKey, "Calendar[Dia_Min]"].filter(Boolean) : [], filters: [`Processo = ${node.label}`, `Calendar[Date] = ${selectedDate.value}`], process: node.label, date: selectedDate.value, updatedAt: automatic ? oracleMeasures.value.updatedAt : forms.savedAt, sourceReference: automatic ? "MIFC.SemanticModel/definition/tables/1-Measure.tmdl; docs/MIFC-DATA-CONTRACT.md" : "Cadastro Capacidade; docs/excel-manual-automatic-map.md", missingKeys,
      editableCapacityId: node.processId,
    }, undefined, node.processId);
  }
  else if (metric === "capacity") openTrace({ id:`${node.id}-capacity`,title:`${node.label} · Capacidade por dia`,displayValue:effective.properties.capacityPerDay > 0 ? effective.properties.capacityPerDay.toLocaleString("pt-BR") : "—",unit:"peças/dia",formula:"Referência importada do processo. A regra genérica capacity.per_day permanece pendente e não é presumida.",simpleExplanation:"A capacidade exibida é a referência cadastrada. O sistema não inventa uma fórmula única enquanto a regra específica da máquina não estiver validada.",inputs:[{key:"referenceCapacityPerDay",label:"Capacidade de referência",value:effective.properties.capacityPerDay || undefined,unit:"peças/dia",origin:"IMPORT"}],intermediateResults:[],origin:"Importado",measureKeys:[],filters:[`Processo = ${node.label}`],process:node.label,date:selectedDate.value,updatedAt:forms.savedAt,sourceReference:"Cadastro Capacidade; regra capacity.per_day pendente",missingKeys:effective.properties.capacityPerDay > 0 ? [] : ["Capacidade de referência"],editableCapacityId: node.processId }, undefined, node.processId);
  else if (metric === "process") { const times=processTimesForNode(node);const missing=times.filter((item)=>item.value===undefined).map((item)=>item.key);openTrace({id:`${node.id}-process`,title:`${node.label} · Tempo do processo`,displayValue:formatMeasureValues(times.map((item)=>item.key),processMeasureValues.value),unit:"dias",formula:times.map((item)=>`${item.key} = ${processTraceConfig[item.key]?.formula ?? "regra catalogada"}`).join(" | "),simpleExplanation:"São tempos das máquinas físicas. LCT e RF2 aparecem em cartões distintos, mas o total FH continua usando apenas a parcela agregada T-LCT/RF2 do PBIP. Os nomes de ENN não acrescentam outra parcela ao total.",inputs:times.map((item)=>({key:item.key,label:`Tempo ${item.key}`,value:item.value,unit:"dias",origin:"CALCULATED"})),intermediateResults:times.map((item)=>`${item.key} = ${item.value===undefined?"—":formatMeasureDetailed(item.value)} dia`),lineageSteps:processLineageSteps(times.map((item)=>item.key)),origin:"Demanda Oracle/MES + capacidade local",measureKeys:times.map((item)=>item.key),filters:[`Calendar[Date] = ${selectedDate.value}`,`Processo = ${node.label}`],process:node.label,date:selectedDate.value,updatedAt:oracleMeasures.value.updatedAt,sourceReference:"MIFC.SemanticModel/definition/tables/1-Measure.tmdl; docs/client-process-matrix.csv",missingKeys:missing,editableCapacityId: node.processId}, undefined, node.processId); }
  else openTrace(productionMetricTrace(node, metrics));
}
function updateBuffer(id: string, patch: Partial<BufferFormRow>) { const row=forms.bufferRows.find((item)=>item.id===id);if(row)Object.assign(row,patch);const positioned=positionedBuffers.value.find((item)=>item.id===id);if(positioned)selectedTrace.value=bufferTrace(positioned); }
function updateVolume(id: string, patch: Partial<VolumeFormRow>) { const row=forms.volumeRows.find((item)=>item.id===id);if(!row)return;Object.assign(row,patch);const pairsPerDay=row.vehiclesPerDay*(1+row.reinforcementPercent/100);for(const buffer of forms.bufferRows.filter((item)=>item.customer===row.customer))buffer.pairsPerDay=pairsPerDay;const lane=clientProcessLanes.find((item)=>item.label===row.customer);if(lane)selectedTrace.value=clientParameterTrace(lane); }
function updateLogistics(id: string, patch: Partial<LogisticsFormRow>) { const row=forms.logisticsRows.find((item)=>item.id===id);if(!row)return;Object.assign(row,patch);const lane=clientProcessLanes.find((item)=>item.label===row.customer);if(lane)selectedTrace.value=clientParameterTrace(lane); }
function updateCapacity(id: string, patch: Partial<CapacityFormRow>) {
  const row = forms.capacityRows.find((item) => item.id === id);
  if (!row) return;
  Object.assign(row, patch);
  const node = activeRevision.value.nodes.find((item) => item.processId === id);
  if (!node || !selectedTrace.value) return;
  if (selectedTrace.value.id.endsWith("-ct")) nodeMetricTrace(node, "cycle");
  else if (selectedTrace.value.id.endsWith("-capacity")) nodeMetricTrace(node, "capacity");
  else if (selectedTrace.value.id.endsWith("-process")) nodeMetricTrace(node, "process");
}
function focusNode(id: string) { const normalized=id.toLocaleLowerCase("pt-BR");const node=activeRevision.value.nodes.find((item)=>item.id===id||item.id.endsWith(`-${id}`)||item.label.replace(/\n/g," ").toLocaleLowerCase("pt-BR").includes(normalized));const rect=canvas.value?.getBoundingClientRect();if(!node||!rect)return;selectedTrace.value=null;selectedCapacityId.value=null;selectedNodeIds.value=[node.id];layout.selectNode(node.id);panelOpen.value=true;pan.x=rect.width/2-(node.x+node.width/2)*zoom.value;pan.y=Math.max(8,rect.height*.35-(node.y+node.height/2)*zoom.value);renameFocusRequest.value+=1; }
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
  selectedTrace.value=null;selectedBufferId.value=null;selectedCapacityId.value=null;
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
function fitView(readable=false) {
  const rect=canvas.value?.getBoundingClientRect();
  if (!rect) return;
  const bounds=visibleBounds.value;
  const fitted=Math.min(1.08,(rect.width-36)/bounds.width,(rect.height-36)/bounds.height);
  zoom.value=readable?Math.max(.52,fitted):fitted;
  pan.x=(rect.width-bounds.width*zoom.value)/2-bounds.x*zoom.value;
  pan.y=(rect.height-bounds.height*zoom.value)/2-bounds.y*zoom.value;
}
function setMachineFocus() {
  visibleLayers.information=false;
  visibleLayers.material=true;
  visibleLayers.metrics=false;
  visibleLayers.buffers=false;
  showLayers.value=false;
  void nextTick(() => fitView(true));
}
function setFullLayout() {
  visibleLayers.information=true;
  visibleLayers.material=true;
  visibleLayers.metrics=true;
  visibleLayers.buffers=true;
  showLayers.value=false;
  void nextTick(() => fitView());
}
function organizeLayout() {
  layout.organizeLayout();
  setMachineFocus();
  ui.showSuccess("Layout reorganizado com foco no fluxo físico das máquinas.");
}
function selectNode(id: string,event?:MouseEvent|KeyboardEvent) { if(suppressNextNodeClick.value){suppressNextNodeClick.value=false;return;} selectedTrace.value=null;selectedBufferId.value=null;selectedCapacityId.value=null;if (activeTool.value === "connect") layout.connectNode(id,activeFlow.value); else { const additive=Boolean(event&&(event.shiftKey||event.ctrlKey||event.metaKey)); if(additive)selectedNodeIds.value=selectedNodeIds.value.includes(id)?selectedNodeIds.value.filter((item)=>item!==id):[...selectedNodeIds.value,id];else selectedNodeIds.value=[id]; layout.selectNode(selectedNodeIds.value.includes(id)?id:selectedNodeIds.value.at(-1)??null); panelOpen.value=true; if(selectedNodeIds.value.length===1)renameFocusRequest.value+=1; } }
function selectEdge(id: string) { selectedTrace.value=null;selectedBufferId.value=null;selectedCapacityId.value=null;selectedNodeIds.value=[]; layout.selectEdge(id); panelOpen.value=true; }
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
function laneLogistics(lane: ClientProcessLane) {
  return forms.logisticsRows.find((row) => row.customer === lane.label && row.status === "active");
}
function laneMeasureValue(lane: ClientProcessLane, measure: PositionedClientLaneMeasure): number | undefined {
  const logistics = laneLogistics(lane);
  if (measure.measureKey === "T-B") return logistics?.beneficiatorDays;
  if (measure.measureKey === "T-T") return logistics?.transportHours === undefined ? undefined : logistics.transportHours / 24;
  if (measure.kind === "process") return processMeasureValues.value[measure.measureKey];
  return oracleMeasures.value.values?.[measure.measureKey];
}
function laneMeasureLabel(lane: ClientProcessLane, measure: PositionedClientLaneMeasure): string {
  const value = laneMeasureValue(lane, measure);
  return value === undefined ? "—" : formatProcessDays(value);
}
function laneMeasureTrace(lane: ClientProcessLane, measure: PositionedClientLaneMeasure): LayoutValueTrace {
  const value = laneMeasureValue(lane, measure);
  const isSlitter = measure.measureKey === `Q-D-${lane.key}`;
  const isTransport = measure.measureKey === "T-T";
  const isBeneficiator = measure.measureKey === "T-B";
  const processConfig = processTraceConfig[measure.measureKey];
  const piecesKey = `E-M-P-S-${lane.key}`;
  const rateKey = `P-M-${lane.key}`;
  const slitterRateValueKey = `P-M-SLITTER-${lane.key}`;
  const formula = isSlitter
    ? `${measure.measureKey} = ${piecesKey} ÷ ${rateKey}`
    : isTransport
      ? "T-T = horas de transporte ÷ 24"
      : isBeneficiator
        ? "T-B = dias informados manualmente para o Beneficiador"
        : processConfig
          ? `${measure.measureKey} = ${processConfig.formula}`
          : `${measure.measureKey} = estoque/WIP do ponto ÷ cadência diária do cliente`;
  const inputs: LayoutValueTrace["inputs"] = [{
    key: measure.measureKey,
    label: measure.kind === "process" ? "Tempo de máquina" : measure.kind === "manual" ? "Parâmetro logístico" : "Buffer em dias",
    value,
    unit: "dias",
    origin: measure.kind === "manual" ? "INPUT" : measure.kind === "process" ? "CALCULATED" : "ORACLE_MES",
  }];
  if (isSlitter) {
    inputs.push(
      { key: piecesKey, label: "Estoque Slitter", value: oracleMeasures.value.values?.[piecesKey], unit: "peças", origin: "CALCULATED" },
      { key: rateKey, label: "Cadência diária no contexto MP[Cliente]", value: oracleMeasures.value.values?.[slitterRateValueKey] ?? oracleMeasures.value.values?.[rateKey], unit: "peças/dia", origin: "ORACLE_MES" },
    );
  }
  return {
    id: `lane-${lane.key}-${measure.measureKey}`,
    title: `${lane.label} · ${isSlitter ? "Slitter" : measure.measureKey}`,
    displayValue: value === undefined ? "—" : formatProcessDays(value),
    unit: "dias",
    formula,
    simpleExplanation: value === undefined
      ? "A medida não foi publicada porque uma entrada necessária não está disponível no mesmo filtro de data. A tela não substitui ausência por zero."
      : isSlitter
        ? "Este é o buffer do Slitter em dias, calculado com a mesma transformação de local, comprimento médio, estoque de lotes e cadência diária do Power BI."
        : "O número fica ligado à posição correspondente do fluxo e permanece separado das demais parcelas.",
    inputs,
    intermediateResults: [`${measure.measureKey} = ${value === undefined ? "—" : formatMeasureDetailed(value)} dia`],
    origin: measure.kind === "manual" ? "Cadastro Logística" : measure.kind === "process" ? "Demanda Oracle/MES + capacidade local" : "Oracle/MES + medida Power BI reproduzida",
    measureKeys: [measure.measureKey, ...(isSlitter ? [piecesKey, rateKey] : [])],
    filters: [`Calendar[Date] = ${selectedDate.value}`, `Cliente = ${lane.label}`],
    client: lane.label,
    process: measure.stageId,
    date: selectedDate.value,
    updatedAt: measure.kind === "manual" ? forms.savedAt : oracleMeasures.value.updatedAt,
    sourceReference: isSlitter ? "MIFC.SemanticModel/definition/expressions.tmdl; medidas Q-D-*" : "docs/layout-card-lineage.csv; docs/client-process-matrix.csv",
    missingKeys: value === undefined ? [measure.measureKey] : [],
  };
}
function clientTotalDisplay(lane: ClientProcessLane) { const value=clientTotals.value[lane.key].value;return value===undefined?"—":formatProcessDays(value); }
async function loadLayoutMeasures() {
  try {
    const [response, lineageResponse] = await Promise.all([
      fetch(`/api/layout/measures?date=${encodeURIComponent(selectedDate.value)}`, { cache: "no-store" }),
      fetch("/api/layout/lineage", { cache: "no-store" }),
    ]);
    if (response.ok) oracleMeasures.value = await response.json() as typeof oracleMeasures.value;
    if (lineageResponse.ok) {
      const lineage = await lineageResponse.json() as { measures?: Record<string, MeasureLineageEntry> };
      measureLineage.value = lineage.measures ?? {};
    }
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
function applyNode(id: string,label: string,properties: LayoutNodeProperties,processId?: string) { layout.applyNode(id,label,properties,processId);const capacity=processId?forms.capacityRows.find((row)=>row.id===processId):undefined;if(capacity)Object.assign(capacity,{process:label,cycleTimeMode:properties.cycleTimeMode ?? capacity.cycleTimeMode,cycleTimeSeconds:properties.cycleTimeSeconds,targetWipPieces:properties.wipPieces,referenceCapacityPerDay:properties.capacityPerDay,shifts:properties.shifts,efficiencyPercent:properties.availabilityPercent}); }
async function saveLayout() { layout.save(); forms.save(); await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout",savedAt:activeRevision.value.savedAt,parametersSavedAt:forms.savedAt}); }
function switchRevision(id: string) { forms.switchRevision(id);layout.switchRevision(id);clearSelection(); }
async function createRevision() { const sourceRevisionId=layout.activeRevisionId;layout.createRevision();forms.cloneRevision(sourceRevisionId,layout.activeRevisionId);clearSelection();await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout-new-revision"}); }
function onKeydown(event: KeyboardEvent) { if(event.key==="Escape"&&isFullscreen.value){event.preventDefault();void document.exitFullscreen();return;}const target=event.target as HTMLElement; if (["INPUT","TEXTAREA","SELECT"].includes(target.tagName)) return; if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z") { event.preventDefault(); event.shiftKey?layout.redo():layout.undo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y") { event.preventDefault(); layout.redo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="d") { event.preventDefault(); duplicate(); } else if (["Delete","Backspace"].includes(event.key)) removeSelected(); }

onMounted(async()=>{layout.hydrate();forms.hydrate(layout.activeRevisionId);operations.hydrate();clearSelection();window.addEventListener("pointermove",onPointerMove,{passive:false});window.addEventListener("pointerup",endInteraction);window.addEventListener("keydown",onKeydown);document.addEventListener("fullscreenchange",onFullscreenChange);operationalNow.value=new Date();operationalClockTimer=setInterval(()=>{operationalNow.value=new Date();},15_000);await loadLayoutMeasures();layoutMeasuresTimer=setInterval(()=>void loadLayoutMeasures(),30_000);await nextTick();fitView(true);if(typeof route.query.focus==="string")focusNode(route.query.focus);});
onBeforeUnmount(()=>{window.removeEventListener("pointermove",onPointerMove);window.removeEventListener("pointerup",endInteraction);window.removeEventListener("keydown",onKeydown);document.removeEventListener("fullscreenchange",onFullscreenChange);if(layoutMeasuresTimer)clearInterval(layoutMeasuresTimer);if(operationalClockTimer)clearInterval(operationalClockTimer);});
watch(()=>route.query.focus,async(focus)=>{if(typeof focus!=="string")return;await nextTick();focusNode(focus);});
watch(()=>[visibleLayers.information,visibleLayers.material,visibleLayers.metrics,visibleLayers.buffers],async()=>{await nextTick();fitView(true);});
</script>

<template>
  <div ref="layoutPage" class="layout-page" :class="{ 'is-fullscreen': isFullscreen }">
    <section class="layout-heading"><div class="breadcrumb"><strong>MIFC</strong><span>›</span><b>Layout</b><select class="revision-select" :value="activeRevision.id" @change="switchRevision(($event.target as HTMLSelectElement).value)"><option v-for="revision in layout.revisions" :key="revision.id" :value="revision.id">{{ revision.label }}</option></select><span v-if="isDirty || forms.isDirty" class="dirty-dot">Alterações não salvas</span></div><div class="heading-actions"><label class="date-context"><span>Calendar[Date]</span><input v-model="selectedDate" type="date" @change="loadLayoutMeasures"/></label><button class="operational-clock" data-testid="operational-clock" type="button" aria-label="Abrir origem do relógio operacional Calendar Dia Min" @click="openTrace(operationalClockTrace())"><small>Calendar[Dia_Min]</small><strong>{{ calendarDayMinutes.toLocaleString('pt-BR') }} min</strong><em>{{ OPERATIONAL_TIME_ZONE }}</em></button><button class="button button-secondary" type="button" @click="createRevision"><Plus :size="16"/>Nova revisão</button><button class="button button-primary" type="button" @click="saveLayout"><Save :size="16"/>Salvar layout<ChevronDown :size="14"/></button></div></section>
    <nav class="layout-toolbar" aria-label="Ferramentas do layout">
      <button :class="{active:activeTool==='select'}" @click="setTool('select')"><MousePointer2 :size="16"/>Selecionar</button><button :class="{active:activeTool==='connect'}" @click="chooseConnect('material_push')"><Waypoints :size="16"/>Conectar</button>
      <select v-model="activeFlow" aria-label="Tipo da conexão" @change="setTool('connect')"><option value="material_push">Material</option><option value="material_pull">Material puxado</option><option value="information">Informação</option><option value="electronic_information">Eletrônica</option></select>
      <button :class="{active:activeTool==='text'}" @click="setTool('text')"><TypeIcon :size="16"/>Texto</button><button @click="chooseConnect(activeFlow)"><Minus :size="16"/>Linha</button><button :class="{active:activeTool==='pan'}" @click="setTool('pan')"><Hand :size="16"/>Mover tela</button><span class="toolbar-separator"></span><button class="focus-tool" :class="{active:machineFocusActive}" @click="setMachineFocus"><Focus :size="16"/>Foco máquinas</button><button :class="{active:fullLayoutActive}" @click="setFullLayout"><LayoutGrid :size="16"/>Fluxo completo</button><button @click="organizeLayout"><RefreshCw :size="16"/>Organizar</button><span class="toolbar-separator"></span>
      <button :disabled="!undoStack.length" @click="layout.undo"><Undo2 :size="17"/>Desfazer</button><button :disabled="!redoStack.length" @click="layout.redo"><Redo2 :size="17"/>Refazer</button><span class="toolbar-separator"></span><button :disabled="!selectedNode" @click="duplicate"><Copy :size="16"/>Duplicar</button><button class="danger-tool" :disabled="!selectedNode&&!selectedEdge" @click="removeSelected"><Trash2 :size="16"/>Excluir</button>
      <div class="toolbar-spacer"></div><div class="layers-control"><button @click="showLayers=!showLayers"><Layers3 :size="16"/>Camadas</button><div v-if="showLayers" class="layers-popover"><label><input v-model="visibleLayers.information" type="checkbox"/>Fluxos de informação</label><label><input v-model="visibleLayers.material" type="checkbox"/>Fluxos de material</label><label><input v-model="visibleLayers.buffers" type="checkbox"/>Buffers e medidas</label><label><input v-model="visibleLayers.metrics" type="checkbox"/>Clientes / Lead Time</label></div></div><button :disabled="!selectedNode&&!selectedEdge&&!selectedTrace" @click="panelOpen=!panelOpen"><Eye :size="16"/>Exibir painel</button><button data-testid="fullscreen-toggle" @click="toggleFullscreen"><Minimize2 v-if="isFullscreen" :size="16"/><Maximize2 v-else :size="16"/>{{ isFullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}</button>
    </nav>
    <section class="editor-shell">
      <div ref="canvas" class="canvas-viewport" :class="[`tool-${activeTool}`, { 'is-panning': interaction.mode === 'pan' }]" data-testid="layout-canvas" @pointerdown.capture="onViewportPointerDown" @pointerdown.self="onCanvasPointerDown" @auxclick.prevent @wheel="onWheel">
        <MifcSymbolPalette @add="addSymbol" @flow="chooseConnect"/>
        <div class="machine-focus-summary" data-testid="machine-focus-summary">
          <div class="focus-summary-copy"><span class="focus-eyebrow"><Activity :size="13"/>FOCO OPERACIONAL</span><strong>Máquinas primeiro</strong><small>O fluxo físico fica em destaque; sistemas, buffers e análises entram sob demanda.</small></div>
          <div class="focus-summary-stats"><span><b>{{ machineReadiness.total }}</b><small>máquinas</small></span><span><b>{{ machineReadiness.automatic }}</b><small>automáticas</small></span><span><b>{{ machineReadiness.pending }}</b><small>pendentes</small></span><span class="focus-data-status" :class="{ ready: oracleMeasures.ready }"><ShieldCheck :size="13"/><small>{{ oracleMeasures.ready ? 'MES lido' : 'MES aguardando' }}</small></span></div>
        </div>
        <div class="canvas-legend" data-testid="canvas-legend"><span class="machine"><i></i>Máquinas · foco principal</span><span v-if="visibleLayers.buffers" class="automatic"><i></i>Power BI / MES · medidas</span><span v-if="visibleLayers.information" class="information"><i></i>Informação · apoio</span></div>
        <div class="canvas-world" :style="worldStyle" @pointerdown.self="onCanvasPointerDown">
          <div v-if="machineFocusActive" class="machine-guide" aria-hidden="true"><div class="machine-guide-title">Fluxo físico · máquinas</div><div class="machine-guide-group preparation" style="left:580px;top:410px;width:700px;height:590px"><strong>01 · Preparação</strong><span>Entrada, LCT, RF2, RF3 e Mesa 3</span></div><div class="machine-guide-group welding" style="left:1280px;top:290px;width:250px;height:760px"><strong>02 · Solda</strong><span>Famílias Beatty por cliente</span></div><div class="machine-guide-group finishing" style="left:1535px;top:420px;width:505px;height:590px"><strong>03 · Acabamento</strong><span>P.A, CNC, Pintura e Rebitagem</span></div><div class="machine-guide-group shipping" style="left:2045px;top:420px;width:485px;height:590px"><strong>04 · Saída</strong><span>Stenhoj, Embalagem e expedição</span></div></div>
          <svg class="edge-layer" :width="WORLD_WIDTH" :height="WORLD_HEIGHT" @pointerdown.self="onCanvasPointerDown">
            <defs><marker id="arrow-material" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1f2c38"/></marker><marker id="arrow-info" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#526170"/></marker></defs>
            <g v-for="edge in renderedEdges" v-show="isEdgeVisible(edge)" :key="edge.id" class="edge-group" :class="[edge.flowType,{selected:selectedEdge?.id===edge.id}]" @click.stop="selectEdge(edge.id)"><path class="edge-hit" :d="edge.geometry.path"/><path class="edge-line" :d="edge.geometry.path" :marker-end="`url(#${isInformationEdge(edge)?'arrow-info':'arrow-material'})`"/><circle v-if="selectedEdge?.id===edge.id" class="curve-handle" :cx="edge.geometry.control.x" :cy="edge.geometry.control.y" r="8" @pointerdown="startCurve($event,edge)"/></g>
          </svg>
          <MifcNodeCard v-for="node in activeRevision.nodes" v-show="isNodeVisible(node)" :key="node.id" :node="displayNode(node)" :zoom="zoom" :selected="selectedNodeIds.includes(node.id)" :primary="selectedNode?.id===node.id" :connecting="activeTool==='connect'" :live-metrics="liveMetricsForNode(node)" :cycle-metrics="cycleMetricsForNode(node)" :action-summary="actionSummaryForNode(node)" :process-times="processTimesForNode(node)" :manual-values="manualValuesForNode(node)" @select="selectNode" @dragstart="startNodeDrag" @resizestart="startResize" @metricselect="nodeMetricTrace"/>
          <LayoutBufferCard v-for="buffer in positionedBuffers" v-show="visibleLayers.buffers" :key="buffer.id" :buffer="buffer" @select="(item) => openTrace(bufferTrace(item), item.id)" />
          <LayoutMeasureBufferCard v-for="buffer in positionedMeasureBuffers" v-show="visibleLayers.buffers" :key="`measure-${buffer.id}`" :buffer="buffer" @select="(item, entry) => openTrace(measureBufferTrace(item, entry))" />
          <div v-if="visibleLayers.metrics" class="client-lead-time-board" data-testid="client-lead-time-board">
            <div class="client-board-title"><strong>Clientes / Lead Time</strong><span>Somente valores em dias · subida = processo · reta = sem processo</span><em class="parity-warning">Fórmulas Power BI + total funcional sem duplicar ENN</em><em :class="{ connected: oracleMeasures.ready }">{{ oracleMeasures.ready ? `Filtro ${selectedDate} · ${filteredRowSummary.toLocaleString('pt-BR')} linhas · Oracle + parâmetros locais · ${oracleMeasures.updatedAt ? new Date(oracleMeasures.updatedAt).toLocaleTimeString('pt-BR') : 'atualizado'}` : 'Aguardando leitura das tabelas' }}</em></div>
            <div v-for="lane in clientLanes" :key="lane.key" class="client-lane" :data-client="lane.key" :data-testid="`client-lane-${lane.key}`">
              <div class="client-lane-label"><button type="button" :aria-label="`Editar parâmetros do cliente ${lane.label}`" @click.stop="openClient(lane)"><strong>{{ lane.label }}</strong><small>Editar parâmetros</small></button></div>
              <svg :viewBox="`0 0 ${WORLD_WIDTH} 56`" :width="WORLD_WIDTH" height="56" role="img" :aria-label="`Linha de processos do cliente ${lane.label}`">
                <path class="client-process-line" :d="lane.path"/>
                <g v-for="stage in positionedClientStages" :key="stage.id" :class="['client-stage-marker', { active: mappingFor(lane,stage)?.participates, pending: mappingFor(lane,stage)?.validationStatus === 'pending' }]" :transform="`translate(${stage.centerX} 0)`">
                  <title>{{ mappingTitle(lane,stage) }}</title>
                  <circle :cy="mappingFor(lane,stage)?.participates ? 10 : 40" r="4.5"/>
                </g>
              </svg>
              <div class="client-measure-keys">
                <button v-for="measure in lane.measures" :key="measure.id" type="button" :data-testid="`client-lane-measure-${lane.key}-${measure.measureKey}`" :aria-label="`Abrir ${measure.measureKey} de ${lane.label}`" :class="[measure.kind, { slitter: measure.measureKey === `Q-D-${lane.key}` }]" :style="{ left: `${measure.centerX}px` }" @click.stop="openTrace(laneMeasureTrace(lane,measure))">{{ laneMeasureLabel(lane,measure) }}</button>
              </div>
              <button class="client-total" type="button" :data-testid="`client-total-${lane.key}`" :aria-label="`Abrir tempo total do cliente ${lane.label}`" @click.stop="openTrace(totalTrace(lane))"><small>Tempo total do cliente</small><strong>{{ clientTotalDisplay(lane) }}</strong><em>{{ clientTotals[lane.key].measureKey }}</em></button>
            </div>
          </div>
        </div>
        <div class="canvas-status"><span v-if="connectSourceId">Agora selecione o bloco de destino</span><span v-else-if="selectedNodeIds.length>1">{{ selectedNodeIds.length }} blocos selecionados · mantenha Ctrl/Shift ao iniciar o arraste para mover o grupo</span><span v-else>{{ activeRevision.nodes.length }} blocos · arraste normal move somente um bloco · Ctrl/Shift seleciona o grupo</span></div><div class="zoom-controls"><button aria-label="Diminuir zoom" @click="setZoom(zoom-.1)"><Minus :size="16"/></button><span>{{ Math.round(zoom*100) }}%</span><button aria-label="Aumentar zoom" @click="setZoom(zoom+.1)"><Plus :size="16"/></button><button aria-label="Ajustar à tela" @click="fitView()"><Maximize2 :size="16"/></button></div>
      </div>
      <LayoutValueTracePanel v-if="panelOpen&&selectedTrace" :trace="selectedTrace" :lineage-catalog="measureLineage" :lineage-values="lineageValues" :editable-buffer="selectedBufferId ? forms.bufferRows.find((item) => item.id === selectedBufferId) : undefined" :editable-volume="selectedVolumeId ? forms.volumeRows.find((item) => item.id === selectedVolumeId) : undefined" :editable-logistics="selectedLogisticsId ? forms.logisticsRows.find((item) => item.id === selectedLogisticsId) : undefined" :editable-capacity="selectedCapacityId ? forms.capacityRows.find((item) => item.id === selectedCapacityId) : undefined" @close="closePanel" @update-buffer="updateBuffer" @update-volume="updateVolume" @update-logistics="updateLogistics" @update-capacity="updateCapacity" />
      <MifcPropertiesPanel v-else-if="panelOpen&&(selectedNode||selectedEdge)" :node="selectedNode" :edge="selectedEdge" :nodes="activeRevision.nodes" :edges="activeRevision.edges" :capacity-rows="forms.capacityRows" :focus-request="renameFocusRequest" @close="closePanel" @update="applyNode" @delete="removeSelected" @update-edge="layout.updateSelectedEdge" @preview-label="layout.previewNodeLabel" @commit-label="layout.commitNodeLabel" @cancel-label="layout.cancelNodeLabel"/>
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
.operational-clock { display:grid; min-width:126px; min-height:38px; align-content:center; padding:3px 9px; border:1px solid #b9e5c8; border-radius:7px; background:#effaf3; color:#146c36; text-align:left; cursor:pointer; }
.operational-clock:hover,.operational-clock:focus-visible { border-color:#28a85b; outline:0; box-shadow:0 0 0 3px rgba(40,168,91,.15); }
.operational-clock small,.operational-clock em { font-size:7px; font-style:normal; line-height:1.1; }
.operational-clock strong { font-size:13px; line-height:1.1; }
.layout-toolbar { position:relative; z-index:60; display:flex; min-height:48px; align-items:center; gap:3px; padding:0 14px; border-bottom:1px solid var(--border-subtle); background:#fff; }
.layout-toolbar button { display:flex; min-height:32px; align-items:center; gap:6px; padding:0 10px; border:1px solid transparent; border-radius:5px; background:transparent; color:#52627a; font-size:10px; }
.layout-toolbar button:hover:not(:disabled),.layout-toolbar button.active { border-color:#cfdbfb; background:var(--brand-blue-soft); color:var(--brand-blue-strong); }
.layout-toolbar button.active { background:var(--brand-blue); color:#fff; }
.layout-toolbar button.focus-tool { border-color:#b8c8ef; background:#f5f8ff; color:#174fcf; font-weight:800; }
.layout-toolbar button.focus-tool.active { background:#155eef; color:#fff; }
.layout-toolbar select { height:30px; border:1px solid var(--border-subtle); border-radius:5px; background:#fff; color:var(--text-secondary); font-size:9px; }
.toolbar-separator { width:1px; height:24px; margin:0 4px; background:var(--border-subtle); }
.toolbar-spacer { flex:1; }
.layout-toolbar .danger-tool:not(:disabled) { color:var(--danger); }
.layers-control { position:relative; }
.layers-popover { position:absolute; z-index:80; top:38px; right:0; display:grid; width:190px; gap:8px; padding:12px; border:1px solid var(--border-subtle); border-radius:8px; background:#fff; box-shadow:var(--shadow-float); font-size:10px; }
.layers-popover label { display:flex; align-items:center; gap:8px; }
.editor-shell { position:relative; display:flex; min-height:0; flex:1; }
.canvas-viewport { position:relative; min-width:0; flex:1; overflow:hidden; background-color:#f8fafc; background-image:linear-gradient(rgba(207,218,231,.26) 1px,transparent 1px),linear-gradient(90deg,rgba(207,218,231,.26) 1px,transparent 1px); background-size:32px 32px; touch-action:none; user-select:none; }
.canvas-viewport.tool-pan { cursor:grab; }
.canvas-viewport.is-panning { cursor:grabbing; }
.canvas-viewport.tool-connect,.canvas-viewport.tool-text { cursor:crosshair; }
.canvas-world { position:absolute; top:0; left:0; isolation:isolate; transform-origin:0 0; }
.machine-focus-summary { position:absolute; z-index:32; top:14px; left:224px; display:flex; min-width:420px; max-width:calc(100% - 470px); align-items:center; justify-content:space-between; gap:22px; padding:11px 14px; border:1px solid #cbd8ee; border-radius:12px; background:rgba(255,255,255,.94); box-shadow:0 8px 24px rgba(30,65,120,.12); backdrop-filter:blur(8px); }
.focus-summary-copy { display:grid; min-width:190px; gap:1px; }
.focus-eyebrow { display:flex; align-items:center; gap:5px; color:#155eef; font-size:8px; font-weight:900; letter-spacing:.12em; }
.focus-summary-copy strong { color:#172b4d; font-size:14px; line-height:1.2; }
.focus-summary-copy small { color:#62738c; font-size:8px; line-height:1.3; }
.focus-summary-stats { display:flex; align-items:center; gap:13px; }
.focus-summary-stats>span { display:grid; min-width:40px; gap:0; color:#243a5b; text-align:center; }
.focus-summary-stats b { font-size:15px; line-height:1; font-variant-numeric:tabular-nums; }
.focus-summary-stats small { color:#718096; font-size:7px; font-weight:700; white-space:nowrap; }
.focus-summary-stats .focus-data-status { display:flex; min-width:88px; align-items:center; justify-content:center; gap:5px; padding:5px 7px; border:1px solid #f1d39b; border-radius:999px; background:#fff8e8; color:#9a6500; }
.focus-summary-stats .focus-data-status.ready { border-color:#b9e5c8; background:#effaf3; color:#15703b; }
.canvas-legend { position:absolute; z-index:42; top:14px; right:18px; display:flex; gap:9px; padding:8px 10px; border:1px solid var(--border-subtle); border-radius:9px; background:rgba(255,255,255,.94); color:#52627a; font-size:8px; font-weight:800; box-shadow:var(--shadow-card); backdrop-filter:blur(8px); }
.canvas-legend span { display:flex; align-items:center; gap:5px; white-space:nowrap; }
.canvas-legend i { width:8px; height:8px; border:1px solid #8394aa; border-radius:3px; background:#fff; }
.canvas-legend .machine i { border-color:#155eef; background:#155eef; }
.canvas-legend .automatic i { border-color:#16884a; background:#e9f7ee; }
.canvas-legend .information i { border-style:dashed; background:#f4f6f9; }
.machine-guide { position:absolute; z-index:0; inset:0; pointer-events:none; }
.machine-guide-title { position:absolute; top:330px; left:590px; padding:4px 8px; border-radius:999px; background:#eaf0ff; color:#155eef; font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
.machine-guide-group { position:absolute; display:grid; align-content:start; gap:3px; padding:12px 14px; border:1px solid rgba(109,135,177,.32); border-top:3px solid #9db5e9; border-radius:18px; background:rgba(242,247,255,.58); }
.machine-guide-group strong { color:#3a5377; font-size:9px; letter-spacing:.08em; text-transform:uppercase; }
.machine-guide-group span { color:#7a8da7; font-size:8px; }
.machine-guide-group.welding { border-color:rgba(116,185,164,.34); border-top-color:#79bfa9; background:rgba(240,251,247,.62); }
.machine-guide-group.finishing { border-color:rgba(236,181,106,.35); border-top-color:#e4ab57; background:rgba(255,250,240,.62); }
.machine-guide-group.shipping { border-color:rgba(142,151,174,.35); border-top-color:#9aa7bc; background:rgba(246,248,251,.72); }
.buffer-legend { position:absolute; z-index:42; top:14px; right:18px; display:flex; gap:7px; padding:7px 9px; border:1px solid var(--border-subtle); border-radius:7px; background:rgba(255,255,255,.96); color:#44556b; font-size:8px; font-weight:700; box-shadow:var(--shadow-card); }
.buffer-legend span { display:flex; align-items:center; gap:5px; white-space:nowrap; }
.buffer-legend i { width:8px; height:8px; border:1px solid #6f8298; border-radius:2px; background:#fff; }
.buffer-legend .manual i { border-color:#b47b24; background:#fff7e8; }
.edge-layer { position:absolute; z-index:1; inset:0; overflow:visible; }
.edge-line { fill:none; stroke:#51677f; stroke-width:1.7; }
.edge-hit { fill:none; stroke:transparent; stroke-width:15; cursor:pointer; }
.edge-group.information .edge-line { stroke:#7e8da1; stroke-dasharray:6 5; opacity:.62; }
.edge-group.electronic_information .edge-line { stroke:#9ba8b8; stroke-dasharray:2 5; opacity:.5; }
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
.client-lane-label button { display:grid; justify-items:start; padding:3px 5px; border:0; border-radius:5px; background:transparent; text-align:left; cursor:pointer; }
.client-lane-label button:hover,.client-lane-label button:focus-visible { outline:0; background:var(--surface-selected); box-shadow:0 0 0 2px var(--focus-ring); }
.client-lane-label strong { color:#263746; font-size:16px; }
.client-lane-label small { color:var(--text-tertiary); font-size:12px; }
.client-lane svg { position:absolute; z-index:1; top:1px; left:0; overflow:visible; }
.client-process-line { fill:none; stroke:#263746; stroke-linejoin:miter; stroke-width:2; vector-effect:non-scaling-stroke; }
.client-stage-marker circle { fill:#fff; stroke:#98a4b4; stroke-width:1.5; }
.client-stage-marker.active circle { fill:#263746; stroke:#263746; }
.client-stage-marker.pending circle { fill:#fff4d6; stroke:#c88800; stroke-dasharray:2 1; }
.client-measure-keys { position:absolute; z-index:2; inset:0; pointer-events:none; }
.client-measure-keys button { position:absolute; top:43px; width:76px; min-height:18px; padding:1px 3px; border:0; border-radius:4px; background:rgba(255,255,255,.94); color:#31536f; font-size:10px; font-weight:800; line-height:1.15; text-align:center; white-space:nowrap; transform:translateX(-50%); cursor:pointer; pointer-events:auto; }
.client-measure-keys button.process { top:10px; color:#263746; transform:translate(-50%,-50%); }
.client-measure-keys button.manual { color:#9a6500; }
.client-measure-keys button.slitter { width:88px; border:1px solid #8bb8a1; background:#f0faf4; color:#087443; font-size:11px; }
.client-measure-keys button:hover,.client-measure-keys button:focus-visible { outline:0; background:var(--surface-selected); color:var(--brand-blue-strong); box-shadow:0 0 0 2px var(--focus-ring); }
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
.canvas-world .type-database,.canvas-world .type-information,.canvas-world .type-text { opacity:.72; }
.canvas-world .type-customer_supplier,.canvas-world .type-storage,.canvas-world .type-truck { opacity:.84; }
@media(max-width:1120px) { .layout-toolbar button { padding-inline:8px; } }
@media(max-width:1120px) { .machine-focus-summary { left:210px; min-width:360px; } .focus-summary-copy small { display:none; } .focus-summary-stats { gap:8px; } }
@media(max-width:760px) { .layout-page { height:calc(100vh - 64px); } .layout-heading { align-items:flex-start; gap:8px; padding:9px 12px; } .breadcrumb { flex-wrap:wrap; } .layout-toolbar { overflow-x:auto; } .canvas-status,.client-lead-time-board { display:none; } .machine-focus-summary { top:10px; right:10px; left:10px; min-width:0; max-width:none; } .focus-summary-copy strong { font-size:12px; } .focus-summary-stats>span:not(.focus-data-status) { display:none; } .canvas-legend { top:76px; right:10px; left:10px; justify-content:center; } }
</style>
