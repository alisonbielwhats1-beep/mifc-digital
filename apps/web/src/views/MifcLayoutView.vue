<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { ChevronDown, Copy, Eye, Hand, Layers3, Maximize2, Minus, MousePointer2, Plus, Redo2, Save, Trash2, Type as TypeIcon, Undo2, Waypoints } from "@lucide/vue";
import type { MifcFlowType } from "@mifc/domain";
import MifcNodeCard from "@/components/layout/MifcNodeCard.vue";
import MifcPropertiesPanel from "@/components/layout/MifcPropertiesPanel.vue";
import MifcSymbolPalette from "@/components/layout/MifcSymbolPalette.vue";
import { edgeGeometry } from "@/domain/layout-graph";
import { useMifcFormsStore } from "@/stores/mifc-forms";
import { useMifcLayoutStore, type LayoutEdge, type LayoutNode, type LayoutNodeProperties, type LayoutNodeType, type LayoutTool } from "@/stores/mifc-layout";
import { useUiStore } from "@/stores/ui";

const WORLD_WIDTH = 1680;
const WORLD_HEIGHT = 760;
const layout = useMifcLayoutStore();
const forms = useMifcFormsStore();
const ui = useUiStore();
const { activeRevision, selectedNode, selectedEdge, isDirty, undoStack, redoStack, activeTool, connectSourceId } = storeToRefs(layout);
const canvas = ref<HTMLElement | null>(null);
const zoom = ref(.72);
const pan = reactive({ x: 0, y: 0 });
const panelOpen = ref(true);
const showLayers = ref(false);
const visibleLayers = reactive({ information: true, material: true, metrics: true });
const activeFlow = ref<MifcFlowType>("material_push");
const interaction = reactive({ mode: "" as ""|"drag"|"resize"|"curve"|"pan", id: "", startX: 0, startY: 0, originX: 0, originY: 0, originWidth: 0, originHeight: 0, originCurve: 0, horizontal: true, recorded: false });

const nodesById = computed(() => new Map(activeRevision.value.nodes.map((node) => [node.id,node])));
const renderedEdges = computed(() => activeRevision.value.edges.map((edge) => {
  const source = nodesById.value.get(edge.sourceNodeId); const target = nodesById.value.get(edge.targetNodeId);
  return source && target ? { ...edge, geometry: edgeGeometry(source,target,edge.curveOffset) } : null;
}).filter((edge): edge is NonNullable<typeof edge> => Boolean(edge)));
const metricNodes = computed(() => activeRevision.value.nodes.filter((node) => ["storage","process","truck"].includes(node.type)).sort((a,b) => a.x-b.x));
const metricRows = computed(() => [
  { key:"cycle", label:"Lead Time", detail:"Tempo de ciclo", icon:"◷", values:metricNodes.value.map((node) => node.type === "process" ? node.properties.cycleTimeSeconds/86400 : node.type === "truck" ? .003 : .167) },
  { key:"wait", label:"Lead Time", detail:"Tempo de espera", icon:"◴", values:metricNodes.value.map((node) => node.type === "storage" && node.properties.capacityPerDay ? node.properties.wipPieces/node.properties.capacityPerDay : .003) },
  { key:"process", label:"Lead Time", detail:"Tempo de processo", icon:"⚙", values:metricNodes.value.map((node) => node.type === "process" ? Math.max(.003,node.properties.cycleTimeSeconds/12000) : 0) },
  { key:"data", label:"Dados", detail:"Informações", icon:"▱", values:metricNodes.value.map((node,index) => node.properties.calculationKey ? .003*(index%5) : 0) },
].map((row) => ({...row,total:row.values.reduce((sum,value) => sum+value,0)})));
const worldStyle = computed(() => ({ width:`${WORLD_WIDTH}px`, height:`${WORLD_HEIGHT}px`, transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom.value})` }));

function formatDays(value: number) { return value.toLocaleString("pt-BR",{minimumFractionDigits:3,maximumFractionDigits:3}); }
function isInformationNode(node: LayoutNode) { return ["database","information","text"].includes(node.type); }
function isInformationEdge(edge: LayoutEdge) { return ["information","electronic_information"].includes(edge.flowType); }
function setTool(tool: LayoutTool) { layout.setTool(tool); showLayers.value = false; }
function chooseConnect(flow: MifcFlowType) { activeFlow.value = flow; layout.setTool("connect"); }
function worldCenter() { const rect = canvas.value?.getBoundingClientRect(); return { x:((rect?.width ?? 1000)/2-pan.x)/zoom.value, y:((rect?.height ?? 700)/2-pan.y)/zoom.value }; }
function worldPoint(event: PointerEvent) { const rect = canvas.value!.getBoundingClientRect(); return { x:(event.clientX-rect.left-pan.x)/zoom.value, y:(event.clientY-rect.top-pan.y)/zoom.value }; }
function addSymbol(type: LayoutNodeType) { const point = worldCenter(); layout.addNode(type,point.x-55,point.y-35); panelOpen.value = true; }
function clearSelection() { layout.selectNode(null); layout.selectEdge(null); }
function onCanvasPointerDown(event: PointerEvent) {
  if (activeTool.value === "text") { const point = worldPoint(event); layout.addNode("text",point.x,point.y); panelOpen.value = true; return; }
  if (activeTool.value === "pan" || event.button === 1) { Object.assign(interaction,{mode:"pan",startX:event.clientX,startY:event.clientY,originX:pan.x,originY:pan.y}); return; }
  clearSelection();
}
function startNodeDrag(event: PointerEvent,node: LayoutNode) { if (activeTool.value === "connect") return; event.preventDefault(); layout.selectNode(node.id); panelOpen.value = true; if (activeTool.value !== "select") return; Object.assign(interaction,{mode:"drag",id:node.id,startX:event.clientX,startY:event.clientY,originX:node.x,originY:node.y,recorded:false}); }
function startResize(event: PointerEvent,node: LayoutNode) { event.preventDefault(); Object.assign(interaction,{mode:"resize",id:node.id,startX:event.clientX,startY:event.clientY,originWidth:node.width,originHeight:node.height,recorded:false}); }
function startCurve(event: PointerEvent,edge: typeof renderedEdges.value[number]) { event.preventDefault(); event.stopPropagation(); layout.selectEdge(edge.id); panelOpen.value = true; Object.assign(interaction,{mode:"curve",id:edge.id,startX:event.clientX,startY:event.clientY,originCurve:edge.curveOffset,horizontal:edge.geometry.horizontal,recorded:false}); }
function onPointerMove(event: PointerEvent) {
  if (!interaction.mode) return;
  const dx = event.clientX-interaction.startX; const dy = event.clientY-interaction.startY;
  if (interaction.mode === "pan") { pan.x=interaction.originX+dx; pan.y=interaction.originY+dy; return; }
  if (!interaction.recorded && Math.hypot(dx,dy)>2) { layout.beginMutation(); interaction.recorded=true; }
  if (!interaction.recorded) return;
  if (interaction.mode === "drag") layout.moveNode(interaction.id,interaction.originX+dx/zoom.value,interaction.originY+dy/zoom.value);
  if (interaction.mode === "resize") layout.resizeNode(interaction.id,interaction.originWidth+dx/zoom.value,interaction.originHeight+dy/zoom.value);
  if (interaction.mode === "curve") layout.moveEdgeCurve(interaction.id,interaction.originCurve+(interaction.horizontal?dy:dx)/zoom.value);
}
function endInteraction() { interaction.mode=""; interaction.id=""; interaction.recorded=false; }
function onWheel(event: WheelEvent) { event.preventDefault(); setZoom(zoom.value+(event.deltaY<0 ? .06 : -.06)); }
function setZoom(value: number) { zoom.value=Math.min(1.5,Math.max(.35,value)); }
function fitView() { const rect=canvas.value?.getBoundingClientRect(); if (!rect) return; zoom.value=Math.min(1,(rect.width-28)/WORLD_WIDTH,(rect.height-28)/WORLD_HEIGHT); pan.x=(rect.width-WORLD_WIDTH*zoom.value)/2; pan.y=(rect.height-WORLD_HEIGHT*zoom.value)/2; }
function selectNode(id: string) { if (activeTool.value === "connect") layout.connectNode(id,activeFlow.value); else { layout.selectNode(id); panelOpen.value=true; } }
function selectEdge(id: string) { layout.selectEdge(id); panelOpen.value=true; }
function removeSelected() { if (!selectedNode.value&&!selectedEdge.value) return; const label=selectedNode.value?.label ?? "esta conexão"; if (!window.confirm(`Remover ${label} desta revisão?`)) return; layout.deleteSelected(); }
function duplicate() { layout.duplicateSelected(); panelOpen.value=true; }
function applyNode(id: string,label: string,properties: LayoutNodeProperties,processId?: string) { layout.applyNode(id,label,properties,processId); }
async function saveLayout() { layout.save(); await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout",savedAt:activeRevision.value.savedAt}); }
async function createRevision() { layout.createRevision(); await ui.saveDemoRevision({revisionId:activeRevision.value.id,kind:"mifc-layout-new-revision"}); }
function onKeydown(event: KeyboardEvent) { const target=event.target as HTMLElement; if (["INPUT","TEXTAREA","SELECT"].includes(target.tagName)) return; if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z") { event.preventDefault(); event.shiftKey?layout.redo():layout.undo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y") { event.preventDefault(); layout.redo(); } else if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="d") { event.preventDefault(); duplicate(); } else if (["Delete","Backspace"].includes(event.key)) removeSelected(); }

onMounted(async()=>{layout.hydrate();forms.hydrate();window.addEventListener("pointermove",onPointerMove);window.addEventListener("pointerup",endInteraction);window.addEventListener("keydown",onKeydown);await nextTick();fitView();});
onBeforeUnmount(()=>{window.removeEventListener("pointermove",onPointerMove);window.removeEventListener("pointerup",endInteraction);window.removeEventListener("keydown",onKeydown);});
</script>

<template>
  <div class="layout-page">
    <section class="layout-heading"><div class="breadcrumb"><strong>MIFC</strong><span>›</span><b>Layout</b><select class="revision-select" :value="activeRevision.id" @change="layout.switchRevision(($event.target as HTMLSelectElement).value)"><option v-for="revision in layout.revisions" :key="revision.id" :value="revision.id">{{ revision.label }}</option></select><span v-if="isDirty" class="dirty-dot">Alterações não salvas</span></div><div class="heading-actions"><button class="button button-secondary" type="button" @click="createRevision"><Plus :size="16"/>Nova revisão</button><button class="button button-primary" type="button" @click="saveLayout"><Save :size="16"/>Salvar layout<ChevronDown :size="14"/></button></div></section>
    <nav class="layout-toolbar" aria-label="Ferramentas do layout">
      <button :class="{active:activeTool==='select'}" @click="setTool('select')"><MousePointer2 :size="16"/>Selecionar</button><button :class="{active:activeTool==='connect'}" @click="chooseConnect('material_push')"><Waypoints :size="16"/>Conectar</button>
      <select v-model="activeFlow" aria-label="Tipo da conexão" @change="setTool('connect')"><option value="material_push">Material</option><option value="material_pull">Material puxado</option><option value="information">Informação</option><option value="electronic_information">Eletrônica</option></select>
      <button :class="{active:activeTool==='text'}" @click="setTool('text')"><TypeIcon :size="16"/>Texto</button><button @click="chooseConnect(activeFlow)"><Minus :size="16"/>Linha</button><button :class="{active:activeTool==='pan'}" @click="setTool('pan')"><Hand :size="16"/>Mover tela</button><span class="toolbar-separator"></span>
      <button :disabled="!undoStack.length" @click="layout.undo"><Undo2 :size="17"/>Desfazer</button><button :disabled="!redoStack.length" @click="layout.redo"><Redo2 :size="17"/>Refazer</button><span class="toolbar-separator"></span><button :disabled="!selectedNode" @click="duplicate"><Copy :size="16"/>Duplicar</button><button class="danger-tool" :disabled="!selectedNode&&!selectedEdge" @click="removeSelected"><Trash2 :size="16"/>Excluir</button>
      <div class="toolbar-spacer"></div><div class="layers-control"><button @click="showLayers=!showLayers"><Layers3 :size="16"/>Camadas</button><div v-if="showLayers" class="layers-popover"><label><input v-model="visibleLayers.information" type="checkbox"/>Fluxos de informação</label><label><input v-model="visibleLayers.material" type="checkbox"/>Fluxos de material</label><label><input v-model="visibleLayers.metrics" type="checkbox"/>Lead Time / Dados</label></div></div><button @click="panelOpen=!panelOpen"><Eye :size="16"/>Exibir</button>
    </nav>
    <section class="editor-shell">
      <div ref="canvas" class="canvas-viewport" :class="[`tool-${activeTool}`]" @pointerdown.self="onCanvasPointerDown" @wheel="onWheel">
        <MifcSymbolPalette @add="addSymbol" @flow="chooseConnect"/>
        <div class="canvas-world" :style="worldStyle" @pointerdown.self="onCanvasPointerDown">
          <svg class="edge-layer" :width="WORLD_WIDTH" :height="WORLD_HEIGHT" @pointerdown.self="onCanvasPointerDown">
            <defs><marker id="arrow-material" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1f2c38"/></marker><marker id="arrow-info" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#526170"/></marker></defs>
            <g v-for="edge in renderedEdges" v-show="isInformationEdge(edge)?visibleLayers.information:visibleLayers.material" :key="edge.id" class="edge-group" :class="[edge.flowType,{selected:selectedEdge?.id===edge.id}]" @click.stop="selectEdge(edge.id)"><path class="edge-hit" :d="edge.geometry.path"/><path class="edge-line" :d="edge.geometry.path" :marker-end="`url(#${isInformationEdge(edge)?'arrow-info':'arrow-material'})`"/><circle v-if="selectedEdge?.id===edge.id" class="curve-handle" :cx="edge.geometry.control.x" :cy="edge.geometry.control.y" r="8" @pointerdown="startCurve($event,edge)"/></g>
          </svg>
          <MifcNodeCard v-for="node in activeRevision.nodes" v-show="isInformationNode(node)?visibleLayers.information:visibleLayers.material" :key="node.id" :node="node" :zoom="zoom" :selected="selectedNode?.id===node.id" :connecting="activeTool==='connect'" @select="selectNode" @dragstart="startNodeDrag" @resizestart="startResize"/>
          <div v-if="visibleLayers.metrics" class="lead-time-board"><div v-for="row in metricRows" :key="row.key" class="lead-row"><div class="lead-label"><i>{{ row.icon }}</i><span><strong>{{ row.label }}</strong><small>({{ row.detail }})</small></span><em>dias</em></div><div class="lead-track"><button v-for="(value,index) in row.values" :key="metricNodes[index].id" type="button" :title="`${metricNodes[index].label}: ${formatDays(value)} dias`" @click="selectNode(metricNodes[index].id)"><small>{{ formatDays(value) }}</small><span :class="{raised:index%3===1}"></span></button></div><output>{{ formatDays(row.total) }}</output><b>dias</b></div></div>
        </div>
        <div class="canvas-status"><span v-if="connectSourceId">Agora selecione o bloco de destino</span><span v-else>{{ activeRevision.nodes.length }} blocos · {{ activeRevision.edges.length }} linhas editáveis</span></div><div class="zoom-controls"><button aria-label="Diminuir zoom" @click="setZoom(zoom-.1)"><Minus :size="16"/></button><span>{{ Math.round(zoom*100) }}%</span><button aria-label="Aumentar zoom" @click="setZoom(zoom+.1)"><Plus :size="16"/></button><button aria-label="Ajustar à tela" @click="fitView"><Maximize2 :size="16"/></button></div>
      </div>
      <MifcPropertiesPanel v-if="panelOpen" :node="selectedNode" :edge="selectedEdge" :nodes="activeRevision.nodes" :edges="activeRevision.edges" :capacity-rows="forms.capacityRows" @close="panelOpen=false" @update="applyNode" @delete="removeSelected" @update-edge="layout.updateSelectedEdge"/>
    </section>
  </div>
</template>

<style scoped>
.layout-page{display:flex;height:calc(100vh - var(--header-height));min-height:690px;flex-direction:column;overflow:hidden;background:#fff}.layout-heading{display:flex;min-height:52px;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid var(--border-subtle)}.breadcrumb{display:flex;align-items:center;gap:10px;font-size:13px}.breadcrumb>b{color:var(--brand-blue-strong)}.breadcrumb>span{color:var(--text-tertiary)}.revision-select{height:27px;padding:0 25px 0 8px;border:1px solid var(--border-subtle);border-radius:999px;background:var(--surface-muted);color:var(--text-secondary);font-size:9px}.dirty-dot{display:flex;align-items:center;gap:5px;color:var(--warning);font-size:9px}.dirty-dot::before{width:6px;height:6px;border-radius:50%;background:var(--brand-orange);content:""}.heading-actions{display:flex;gap:8px}.heading-actions .button{min-height:36px;padding:0 13px;font-size:11px}.layout-toolbar{position:relative;z-index:60;display:flex;min-height:48px;align-items:center;gap:3px;padding:0 14px;border-bottom:1px solid var(--border-subtle);background:#fff}.layout-toolbar button{display:flex;min-height:32px;align-items:center;gap:6px;padding:0 10px;border:1px solid transparent;border-radius:5px;background:transparent;color:#52627a;font-size:10px}.layout-toolbar button:hover:not(:disabled),.layout-toolbar button.active{border-color:#cfdbfb;background:var(--brand-blue-soft);color:var(--brand-blue-strong)}.layout-toolbar button.active{background:var(--brand-blue);color:#fff}.layout-toolbar select{height:30px;border:1px solid var(--border-subtle);border-radius:5px;background:#fff;color:var(--text-secondary);font-size:9px}.toolbar-separator{width:1px;height:24px;margin:0 4px;background:var(--border-subtle)}.toolbar-spacer{flex:1}.layout-toolbar .danger-tool:not(:disabled){color:var(--danger)}.layers-control{position:relative}.layers-popover{position:absolute;z-index:80;top:38px;right:0;display:grid;width:190px;gap:8px;padding:12px;border:1px solid var(--border-subtle);border-radius:8px;background:#fff;box-shadow:var(--shadow-float);font-size:10px}.layers-popover label{display:flex;align-items:center;gap:8px}.editor-shell{position:relative;display:flex;min-height:0;flex:1}.canvas-viewport{position:relative;min-width:0;flex:1;overflow:hidden;background-color:#fff;background-image:radial-gradient(#d8dee8 .8px,transparent .8px);background-size:14px 14px;touch-action:none}.canvas-viewport.tool-pan{cursor:grab}.canvas-viewport.tool-connect,.canvas-viewport.tool-text{cursor:crosshair}.canvas-world{position:absolute;top:0;left:0;transform-origin:0 0}.edge-layer{position:absolute;z-index:1;inset:0;overflow:visible}.edge-line{fill:none;stroke:#1f2c38;stroke-width:1.6}.edge-hit{fill:none;stroke:transparent;stroke-width:15;cursor:pointer}.edge-group.information .edge-line{stroke:#526170;stroke-dasharray:6 5}.edge-group.electronic_information .edge-line{stroke:#526170;stroke-dasharray:2 5}.edge-group.material_pull .edge-line{stroke-dasharray:9 4}.edge-group.selected .edge-line{stroke:var(--brand-blue);stroke-width:3}.curve-handle{fill:#fff;stroke:var(--brand-blue);stroke-width:3;cursor:move}.lead-time-board{position:absolute;z-index:14;right:22px;bottom:12px;left:22px;display:grid;gap:4px;padding-top:10px;border-top:1px solid #dce3ed;background:rgba(255,255,255,.95)}.lead-row{display:grid;grid-template-columns:165px 1fr 55px 24px;align-items:center;gap:8px;min-height:31px}.lead-label{display:grid;grid-template-columns:25px 1fr auto;align-items:center;gap:6px}.lead-label i{font-size:20px;font-style:normal}.lead-label span{display:grid}.lead-label strong{font-size:9px}.lead-label small{color:var(--text-tertiary);font-size:7px}.lead-label em{font-size:7px;font-style:normal}.lead-track{display:flex;height:31px;align-items:flex-end}.lead-track button{position:relative;min-width:0;height:31px;flex:1;padding:0;border:0;background:transparent;color:#1f2c38}.lead-track small{position:absolute;top:0;left:50%;font-size:7px;transform:translateX(-50%)}.lead-track span{position:absolute;right:0;bottom:3px;left:0;height:8px;border-bottom:1.5px solid #263746}.lead-track span.raised{bottom:9px}.lead-track span::after{position:absolute;right:0;bottom:-1px;width:1.5px;height:7px;background:#263746;content:""}.lead-row output{padding:5px;border:1px solid #263746;background:#fff;font-size:8px;text-align:center}.lead-row>b{font-size:7px}.canvas-status{position:absolute;bottom:15px;left:15px;z-index:40;padding:7px 10px;border:1px solid var(--border-subtle);border-radius:6px;background:rgba(255,255,255,.94);color:var(--text-secondary);font-size:9px;box-shadow:var(--shadow-card)}.zoom-controls{position:absolute;right:18px;bottom:15px;z-index:40;display:flex;align-items:center;border:1px solid var(--border-subtle);border-radius:7px;background:#fff;box-shadow:var(--shadow-card)}.zoom-controls button{display:grid;width:34px;height:34px;place-items:center;border:0;border-left:1px solid var(--border-subtle);background:#fff}.zoom-controls button:first-child{border-left:0}.zoom-controls span{width:52px;color:var(--text-secondary);font-size:9px;text-align:center}@media(max-width:1120px){.layout-toolbar button{padding-inline:8px}.layout-toolbar button:not(.active) svg+span{display:none}}@media(max-width:760px){.layout-page{height:calc(100vh - 64px)}.layout-heading{align-items:flex-start;gap:8px;padding:9px 12px}.breadcrumb{flex-wrap:wrap}.layout-toolbar{overflow-x:auto}.canvas-status{display:none}.lead-time-board{display:none}}
</style>
