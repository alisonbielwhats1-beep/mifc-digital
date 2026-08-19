<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { ChevronDown, Copy, Eye, Hand, Layers3, Maximize2, Minimize2, Minus, MousePointer2, Plus, Redo2, Save, Trash2, Type as TypeIcon, Undo2, Waypoints } from "@lucide/vue";
import type { MifcFlowType } from "@mifc/domain";
import MifcNodeCard from "@/components/layout/MifcNodeCard.vue";
import MifcPropertiesPanel from "@/components/layout/MifcPropertiesPanel.vue";
import MifcSymbolPalette from "@/components/layout/MifcSymbolPalette.vue";
import { buildClientProcessPath, clientProcessLanes, positionClientStages, type ClientProcessLane, type ClientStageMapping, type PositionedClientStage } from "@/domain/client-process-matrix";
import { edgeGeometry } from "@/domain/layout-graph";
import { useMifcFormsStore } from "@/stores/mifc-forms";
import { useMifcLayoutStore, type LayoutEdge, type LayoutNode, type LayoutNodeProperties, type LayoutNodeType, type LayoutTool } from "@/stores/mifc-layout";
import { useUiStore } from "@/stores/ui";

const WORLD_WIDTH = 1680;
const WORLD_HEIGHT = 820;
const layout = useMifcLayoutStore();
const forms = useMifcFormsStore();
const ui = useUiStore();
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
const interaction = reactive({ mode: "" as ""|"drag"|"resize"|"curve"|"pan", id: "", pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, originWidth: 0, originHeight: 0, originCurve: 0, horizontal: true, recorded: false });

const nodesById = computed(() => new Map(activeRevision.value.nodes.map((node) => [node.id,node])));
const renderedEdges = computed(() => activeRevision.value.edges.map((edge) => {
  const source = nodesById.value.get(edge.sourceNodeId); const target = nodesById.value.get(edge.targetNodeId);
  return source && target ? { ...edge, geometry: edgeGeometry(source,target,edge.curveOffset) } : null;
}).filter((edge): edge is NonNullable<typeof edge> => Boolean(edge)));
const positionedClientStages = computed(() => positionClientStages(activeRevision.value.nodes));
const clientLanes = computed(() => clientProcessLanes.map((lane) => ({ ...lane, path: buildClientProcessPath(lane, positionedClientStages.value) })));
const worldStyle = computed(() => ({ width:`${WORLD_WIDTH}px`, height:`${WORLD_HEIGHT}px`, transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom.value})` }));

function isInformationNode(node: LayoutNode) { return ["database","information","text"].includes(node.type); }
function isInformationEdge(edge: LayoutEdge) { return ["information","electronic_information"].includes(edge.flowType); }
function setTool(tool: LayoutTool) { layout.setTool(tool); showLayers.value = false; }
function chooseConnect(flow: MifcFlowType) { activeFlow.value = flow; layout.setTool("connect"); }
function worldCenter() { const rect = canvas.value?.getBoundingClientRect(); return { x:((rect?.width ?? 1000)/2-pan.x)/zoom.value, y:((rect?.height ?? 700)/2-pan.y)/zoom.value }; }
function worldPoint(event: PointerEvent) { const rect = canvas.value!.getBoundingClientRect(); return { x:(event.clientX-rect.left-pan.x)/zoom.value, y:(event.clientY-rect.top-pan.y)/zoom.value }; }
function addSymbol(type: LayoutNodeType) { const point = worldCenter(); layout.addNode(type,point.x-55,point.y-35); panelOpen.value = true; }
function clearSelection() { layout.selectNode(null); layout.selectEdge(null); }
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
function startNodeDrag(event: PointerEvent,node: LayoutNode) { if (activeTool.value === "connect") return; event.preventDefault(); layout.selectNode(node.id); panelOpen.value = true; if (activeTool.value !== "select") return; Object.assign(interaction,{mode:"drag",id:node.id,startX:event.clientX,startY:event.clientY,originX:node.x,originY:node.y,recorded:false}); }
function startResize(event: PointerEvent,node: LayoutNode) { event.preventDefault(); Object.assign(interaction,{mode:"resize",id:node.id,startX:event.clientX,startY:event.clientY,originWidth:node.width,originHeight:node.height,recorded:false}); }
function startCurve(event: PointerEvent,edge: typeof renderedEdges.value[number]) { event.preventDefault(); event.stopPropagation(); layout.selectEdge(edge.id); panelOpen.value = true; Object.assign(interaction,{mode:"curve",id:edge.id,startX:event.clientX,startY:event.clientY,originCurve:edge.curveOffset,horizontal:edge.geometry.horizontal,recorded:false}); }
function onPointerMove(event: PointerEvent) {
  if (!interaction.mode) return;
  event.preventDefault();
  const dx = event.clientX-interaction.startX; const dy = event.clientY-interaction.startY;
  if (interaction.mode === "pan") { pan.x=interaction.originX+dx; pan.y=interaction.originY+dy; return; }
  if (!interaction.recorded && Math.hypot(dx,dy)>2) { layout.beginMutation(); interaction.recorded=true; }
  if (!interaction.recorded) return;
  if (interaction.mode === "drag") layout.moveNode(interaction.id,interaction.originX+dx/zoom.value,interaction.originY+dy/zoom.value);
  if (interaction.mode === "resize") layout.resizeNode(interaction.id,interaction.originWidth+dx/zoom.value,interaction.originHeight+dy/zoom.value);
  if (interaction.mode === "curve") layout.moveEdgeCurve(interaction.id,interaction.originCurve+(interaction.horizontal?dy:dx)/zoom.value);
}
function endInteraction() {
  if (interaction.pointerId >= 0 && canvas.value?.hasPointerCapture?.(interaction.pointerId)) canvas.value.releasePointerCapture(interaction.pointerId);
  interaction.mode=""; interaction.id=""; interaction.pointerId=-1; interaction.recorded=false;
}
function onWheel(event: WheelEvent) { event.preventDefault(); setZoom(zoom.value+(event.deltaY<0 ? .06 : -.06)); }
function setZoom(value: number) { zoom.value=Math.min(1.5,Math.max(.35,value)); }
function fitView() { const rect=canvas.value?.getBoundingClientRect(); if (!rect) return; zoom.value=Math.min(1,(rect.width-28)/WORLD_WIDTH,(rect.height-28)/WORLD_HEIGHT); pan.x=(rect.width-WORLD_WIDTH*zoom.value)/2; pan.y=(rect.height-WORLD_HEIGHT*zoom.value)/2; }
function selectNode(id: string) { if (activeTool.value === "connect") layout.connectNode(id,activeFlow.value); else { layout.selectNode(id); panelOpen.value=true; renameFocusRequest.value+=1; } }
function selectEdge(id: string) { layout.selectEdge(id); panelOpen.value=true; }
function mappingFor(lane: ClientProcessLane, stage: PositionedClientStage): ClientStageMapping | undefined { return lane.mappings.find((mapping) => mapping.stageId === stage.id); }
function mappingTitle(lane: ClientProcessLane, stage: PositionedClientStage) {
  const mapping = mappingFor(lane, stage);
  if (!mapping) return `${lane.label} · ${stage.label}`;
  const process = mapping.processMeasureKeys.length ? mapping.processMeasureKeys.join(" + ") : "sem medida de processo";
  const stock = mapping.stockMeasureKeys.length ? mapping.stockMeasureKeys.join(" + ") : "sem medida de estoque";
  return `${lane.label} · ${stage.label}\nProcesso: ${process}\nEstoque/logística: ${stock}\n${mapping.evidence}`;
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
function removeSelected() { if (!selectedNode.value&&!selectedEdge.value) return; const label=selectedNode.value?.label ?? "esta conexão"; if (!window.confirm(`Remover ${label} desta revisão?`)) return; layout.deleteSelected(); }
function duplicate() { layout.duplicateSelected(); panelOpen.value=true; }
function applyNode(id: string,label: string,properties: LayoutNodeProperties,processId?: string) { layout.applyNode(id,label,properties,processId); }
async function saveLayout() { layout.save(); await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout",savedAt:activeRevision.value.savedAt}); }
async function createRevision() { layout.createRevision(); await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout-new-revision"}); }
function onKeydown(event: KeyboardEvent) { const target=event.target as HTMLElement; if (["INPUT","TEXTAREA","SELECT"].includes(target.tagName)) return; if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z") { event.preventDefault(); event.shiftKey?layout.redo():layout.undo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y") { event.preventDefault(); layout.redo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="d") { event.preventDefault(); duplicate(); } else if (["Delete","Backspace"].includes(event.key)) removeSelected(); }

onMounted(async()=>{layout.hydrate();forms.hydrate();window.addEventListener("pointermove",onPointerMove,{passive:false});window.addEventListener("pointerup",endInteraction);window.addEventListener("keydown",onKeydown);document.addEventListener("fullscreenchange",onFullscreenChange);await nextTick();fitView();});
onBeforeUnmount(()=>{window.removeEventListener("pointermove",onPointerMove);window.removeEventListener("pointerup",endInteraction);window.removeEventListener("keydown",onKeydown);document.removeEventListener("fullscreenchange",onFullscreenChange);});
</script>

<template>
  <div ref="layoutPage" class="layout-page" :class="{ 'is-fullscreen': isFullscreen }">
    <section class="layout-heading"><div class="breadcrumb"><strong>MIFC</strong><span>›</span><b>Layout</b><select class="revision-select" :value="activeRevision.id" @change="layout.switchRevision(($event.target as HTMLSelectElement).value)"><option v-for="revision in layout.revisions" :key="revision.id" :value="revision.id">{{ revision.label }}</option></select><span v-if="isDirty" class="dirty-dot">Alterações não salvas</span></div><div class="heading-actions"><button class="button button-secondary" type="button" @click="createRevision"><Plus :size="16"/>Nova revisão</button><button class="button button-primary" type="button" @click="saveLayout"><Save :size="16"/>Salvar layout<ChevronDown :size="14"/></button></div></section>
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
          <MifcNodeCard v-for="node in activeRevision.nodes" v-show="isInformationNode(node)?visibleLayers.information:visibleLayers.material" :key="node.id" :node="node" :zoom="zoom" :selected="selectedNode?.id===node.id" :connecting="activeTool==='connect'" @select="selectNode" @dragstart="startNodeDrag" @resizestart="startResize"/>
          <div v-if="visibleLayers.metrics" class="client-lead-time-board" data-testid="client-lead-time-board">
            <div class="client-board-title"><strong>Clientes / Lead Time</strong><span>Subida = processo na etapa · reta = sem processo mapeado</span></div>
            <div class="client-stage-labels" aria-label="Etapas rastreadas no Power BI">
              <button v-for="stage in positionedClientStages" :key="stage.id" type="button" :style="{ left: `${stage.centerX}px` }" :title="`Alinhado ao bloco ${stage.layoutNodeId}`" @click="selectNode(stage.layoutNodeId)">{{ stage.label }}</button>
            </div>
            <div v-for="lane in clientLanes" :key="lane.key" class="client-lane" :data-client="lane.key" :data-testid="`client-lane-${lane.key}`">
              <div class="client-lane-label"><strong>{{ lane.label }}</strong><small>{{ lane.totalMeasureKey }}</small></div>
              <svg :viewBox="`0 0 ${WORLD_WIDTH} 34`" :width="WORLD_WIDTH" height="34" role="img" :aria-label="`Linha de processos do cliente ${lane.label}`">
                <path class="client-process-line" :d="lane.path"/>
                <g v-for="stage in positionedClientStages" :key="stage.id" :class="['client-stage-marker', { active: mappingFor(lane,stage)?.participates, pending: mappingFor(lane,stage)?.validationStatus === 'pending' }]" :transform="`translate(${stage.centerX} 0)`">
                  <title>{{ mappingTitle(lane,stage) }}</title>
                  <circle :cy="mappingFor(lane,stage)?.participates ? 7 : 23" r="3.5"/>
                </g>
              </svg>
              <div class="client-measure-keys" aria-hidden="true">
                <span v-for="stage in positionedClientStages" :key="stage.id" :class="{ inactive: !mappingFor(lane,stage)?.participates, pending: mappingFor(lane,stage)?.validationStatus === 'pending' }" :style="{ left: `${stage.centerX}px` }">{{ mappingFor(lane,stage)?.participates ? mappingFor(lane,stage)?.processMeasureKeys.join(' / ') : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="canvas-status"><span v-if="connectSourceId">Agora selecione o bloco de destino</span><span v-else>{{ activeRevision.nodes.length }} blocos · {{ activeRevision.edges.length }} linhas editáveis</span></div><div class="zoom-controls"><button aria-label="Diminuir zoom" @click="setZoom(zoom-.1)"><Minus :size="16"/></button><span>{{ Math.round(zoom*100) }}%</span><button aria-label="Aumentar zoom" @click="setZoom(zoom+.1)"><Plus :size="16"/></button><button aria-label="Ajustar à tela" @click="fitView"><Maximize2 :size="16"/></button></div>
      </div>
      <MifcPropertiesPanel v-if="panelOpen" :node="selectedNode" :edge="selectedEdge" :nodes="activeRevision.nodes" :edges="activeRevision.edges" :capacity-rows="forms.capacityRows" :focus-request="renameFocusRequest" @close="panelOpen=false" @update="applyNode" @delete="removeSelected" @update-edge="layout.updateSelectedEdge" @preview-label="layout.previewNodeLabel" @commit-label="layout.commitNodeLabel" @cancel-label="layout.cancelNodeLabel"/>
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
.client-lead-time-board { position:absolute; z-index:14; right:0; bottom:8px; left:0; height:222px; padding-top:27px; border-top:1px solid #dce3ed; background:rgba(255,255,255,.96); }
.client-board-title { position:absolute; top:5px; left:20px; display:flex; align-items:baseline; gap:10px; color:#263746; }
.client-board-title strong { font-size:9px; text-transform:uppercase; }
.client-board-title span { color:var(--text-tertiary); font-size:7px; }
.client-stage-labels { position:absolute; z-index:2; top:4px; right:0; left:0; height:23px; }
.client-stage-labels button { position:absolute; max-width:92px; padding:0; border:0; background:transparent; color:#405066; font-size:7px; line-height:1.1; transform:translateX(-50%); cursor:pointer; }
.client-stage-labels button:hover { color:var(--brand-blue); text-decoration:underline; }
.client-lane { position:relative; height:46px; border-top:1px solid #eef1f5; }
.client-lane-label { position:absolute; z-index:3; top:7px; left:20px; display:grid; width:112px; }
.client-lane-label strong { color:#263746; font-size:9px; }
.client-lane-label small { color:var(--text-tertiary); font-size:7px; }
.client-lane svg { position:absolute; z-index:1; top:1px; left:0; overflow:visible; }
.client-process-line { fill:none; stroke:#263746; stroke-linejoin:miter; stroke-width:1.5; vector-effect:non-scaling-stroke; }
.client-stage-marker circle { fill:#fff; stroke:#98a4b4; stroke-width:1.2; }
.client-stage-marker.active circle { fill:#263746; stroke:#263746; }
.client-stage-marker.pending circle { fill:#fff4d6; stroke:#c88800; stroke-dasharray:2 1; }
.client-measure-keys { position:absolute; z-index:2; top:29px; right:0; left:0; height:11px; pointer-events:none; }
.client-measure-keys span { position:absolute; max-width:110px; overflow:hidden; color:#4c5d70; font-size:6px; line-height:1; text-align:center; text-overflow:ellipsis; white-space:nowrap; transform:translateX(-50%); }
.client-measure-keys span.inactive { color:#a1aab5; }
.client-measure-keys span.pending { color:#a66f00; }
.canvas-status { position:absolute; bottom:15px; left:15px; z-index:40; padding:7px 10px; border:1px solid var(--border-subtle); border-radius:6px; background:rgba(255,255,255,.94); color:var(--text-secondary); font-size:9px; box-shadow:var(--shadow-card); }
.zoom-controls { position:absolute; right:18px; bottom:15px; z-index:40; display:flex; align-items:center; border:1px solid var(--border-subtle); border-radius:7px; background:#fff; box-shadow:var(--shadow-card); }
.zoom-controls button { display:grid; width:34px; height:34px; place-items:center; border:0; border-left:1px solid var(--border-subtle); background:#fff; }
.zoom-controls button:first-child { border-left:0; }
.zoom-controls span { width:52px; color:var(--text-secondary); font-size:9px; text-align:center; }
@media(max-width:1120px) { .layout-toolbar button { padding-inline:8px; } }
@media(max-width:760px) { .layout-page { height:calc(100vh - 64px); } .layout-heading { align-items:flex-start; gap:8px; padding:9px 12px; } .breadcrumb { flex-wrap:wrap; } .layout-toolbar { overflow-x:auto; } .canvas-status,.client-lead-time-board { display:none; } }
</style>
