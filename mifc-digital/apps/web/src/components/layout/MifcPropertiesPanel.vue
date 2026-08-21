<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { ArrowDownToLine, ArrowUpFromLine, Link2Off, Save, Trash2, X } from "@lucide/vue";
import type { CapacityFormRow } from "@/stores/mifc-forms";
import type { LayoutEdge, LayoutNode, LayoutNodeProperties } from "@/stores/mifc-layout";
import { useOperationsStore } from "@/stores/operations";
import { effectiveActionStatus } from "@/domain/operations";

const props = defineProps<{ node?: LayoutNode; edge?: LayoutEdge; nodes: LayoutNode[]; edges: LayoutEdge[]; capacityRows: CapacityFormRow[]; focusRequest: number }>();
const operations = useOperationsStore();
operations.hydrate();
const emit = defineEmits<{
  close: [];
  update: [id: string, label: string, properties: LayoutNodeProperties, processId?: string];
  delete: [];
  updateEdge: [patch: Partial<Pick<LayoutEdge,"flowType"|"sourceNodeId"|"targetNodeId"|"curveOffset">>];
  previewLabel: [id: string, label: string];
  commitLabel: [id: string, previousLabel: string, label: string];
  cancelLabel: [id: string, previousLabel: string];
}>();

const draft = reactive({ label: "", processId: "", code: "", cycleTimeMode: "manual" as CapacityFormRow["cycleTimeMode"], cycleTimeSeconds: 0, wipPieces: 0, capacityPerDay: 0, shifts: 2, availabilityPercent: 90, notes: "", calculationKey: "" });
const nameInput = ref<HTMLInputElement | null>(null);
let originalLabel = "";
watch(() => [props.node?.id, props.focusRequest] as const, async ([nodeId], previous) => {
  const node = props.node;
  if (!node) return;
  if (nodeId !== previous?.[0]) {
    originalLabel = node.label;
    Object.assign(draft, { label: node.label, processId: node.processId ?? "", ...node.properties });
  }
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select();
}, { immediate: true });

const nodeMap = computed(() => new Map(props.nodes.map((node) => [node.id, node.label])));
const entries = computed(() => props.node ? props.edges.filter((edge) => edge.targetNodeId === props.node!.id).map((edge) => nodeMap.value.get(edge.sourceNodeId) ?? "Bloco") : []);
const outputs = computed(() => props.node ? props.edges.filter((edge) => edge.sourceNodeId === props.node!.id).map((edge) => nodeMap.value.get(edge.targetNodeId) ?? "Bloco") : []);
const sourceName = computed(() => props.edge ? nodeMap.value.get(props.edge.sourceNodeId) : "");
const targetName = computed(() => props.edge ? nodeMap.value.get(props.edge.targetNodeId) : "");
const relatedProcess = computed(() => props.node ? operations.processes.find((process) => process.layoutNodeId === props.node?.id || process.id === props.node?.processId) : undefined);
const relatedActionSummary = computed(() => {
  if (!props.node) return { open: 0, overdue: 0 };
  const items = operations.actions.filter((action) => action.layoutNodeId === props.node?.id || action.processId === relatedProcess.value?.id);
  return { open: items.filter((action) => !["completed","cancelled"].includes(action.status)).length, overdue: items.filter((action) => effectiveActionStatus(action) === "overdue").length };
});

function applyCapacityLink() {
  const capacity = props.capacityRows.find((row) => row.id === draft.processId);
  if (!capacity) return;
  Object.assign(draft, { label: capacity.process, code: capacity.processCode, cycleTimeMode: capacity.cycleTimeMode, cycleTimeSeconds: capacity.cycleTimeSeconds, wipPieces: capacity.targetWipPieces, capacityPerDay: capacity.referenceCapacityPerDay ?? 0, shifts: capacity.shifts, availabilityPercent: capacity.efficiencyPercent });
}
function previewLabel() {
  if (!props.node) return;
  emit("previewLabel", props.node.id, draft.label);
}
function commitLabel() {
  if (!props.node) return;
  const nextLabel = draft.label.trim();
  if (!nextLabel) { cancelLabel(); return; }
  emit("commitLabel", props.node.id, originalLabel, nextLabel);
  originalLabel = nextLabel;
  draft.label = nextLabel;
}
function cancelLabel() {
  if (!props.node) return;
  draft.label = originalLabel;
  emit("cancelLabel", props.node.id, originalLabel);
  nameInput.value?.select();
}
function save() {
  commitLabel();
  emit("update", props.node!.id, draft.label, { code: draft.code, cycleTimeMode: draft.cycleTimeMode, cycleTimeSeconds: Number(draft.cycleTimeSeconds), wipPieces: Number(draft.wipPieces), capacityPerDay: Number(draft.capacityPerDay), shifts: Number(draft.shifts), availabilityPercent: Number(draft.availabilityPercent), notes: draft.notes, calculationKey: draft.calculationKey }, draft.processId || undefined);
}
</script>

<template>
  <aside class="properties-panel" aria-label="Propriedades do elemento selecionado">
    <header><strong>Propriedades</strong><button type="button" aria-label="Fechar propriedades" @click="$emit('close')"><X :size="18" /></button></header>
    <template v-if="node">
      <div class="selected-summary"><span class="health"></span><div><small>Elemento selecionado</small><strong>{{ node.label }}</strong></div></div>
      <form class="property-form" @submit.prevent="save">
        <label v-if="node.type === 'process'"><span>Processo de Capacidade</span><select v-model="draft.processId" @change="applyCapacityLink"><option value="">Sem vínculo</option><option v-for="process in capacityRows" :key="process.id" :value="process.id">{{ process.processCode }} · {{ process.process }}</option></select></label>
        <label><span>Nome do bloco</span><input ref="nameInput" v-model="draft.label" data-testid="node-name-input" required maxlength="80" @input="previewLabel" @blur="commitLabel" @keydown.enter.stop.prevent="commitLabel" @keydown.esc.stop.prevent="cancelLabel" /></label>
        <label><span>Código</span><input v-model.trim="draft.code" maxlength="30" /></label>
        <div class="two-columns"><label><span>Modo CT</span><select v-model="draft.cycleTimeMode"><option value="manual">Manual</option><option value="automatic">Automático (MES)</option></select></label><label><span>Tempo de Ciclo — CT (s/unid.)</span><input v-model.number="draft.cycleTimeSeconds" type="number" min="0" step="0.1" :disabled="draft.cycleTimeMode === 'automatic'" /></label></div><label><span>WIP-meta (peças)</span><input v-model.number="draft.wipPieces" type="number" min="0" step="1" /></label>
        <label><span>Capacidade / dia <small>(pç/dia)</small></span><input v-model.number="draft.capacityPerDay" type="number" min="0" step="1" /></label>
        <div class="two-columns"><label><span>Turnos</span><select v-model.number="draft.shifts"><option :value="1">1 turno</option><option :value="2">2 turnos</option><option :value="3">3 turnos</option><option :value="4">4 turnos</option></select></label><label><span>Disponibilidade</span><div class="unit-input"><input v-model.number="draft.availabilityPercent" type="number" min="0" max="100" /><b>%</b></div></label></div>
        <label><span>Regra / medida vinculada</span><input v-model.trim="draft.calculationKey" placeholder="Ex.: T-RF3" /></label>
        <label><span>Observações</span><textarea v-model.trim="draft.notes" rows="3" maxlength="500" placeholder="Inclua contexto operacional..."></textarea><small class="count">{{ draft.notes.length }} / 500</small></label>
        <section class="connections"><h3>Conexões</h3><div><ArrowDownToLine :size="15" /><span>Entradas</span><strong>{{ entries.length ? entries.join(', ') : 'Nenhuma' }}</strong></div><div><ArrowUpFromLine :size="15" /><span>Saídas</span><strong>{{ outputs.length ? outputs.join(', ') : 'Nenhuma' }}</strong></div></section>
        <section v-if="node.type === 'process'" class="entity-links"><RouterLink v-if="relatedProcess" :to="`/processes?focus=${relatedProcess.id}`">Abrir dados do processo</RouterLink><RouterLink :to="{ path: '/actions', query: { new: '1', processId: relatedProcess?.id, layoutNodeId: node.id } }">Criar ação relacionada</RouterLink><small>{{ relatedActionSummary.open }} aberta(s) · {{ relatedActionSummary.overdue }} atrasada(s)</small></section>
        <button class="button button-primary save-properties" type="submit"><Save :size="16" /> Aplicar propriedades</button>
      </form>
      <button class="delete-button" type="button" @click="$emit('delete')"><Trash2 :size="16" /> Remover bloco desta revisão</button>
      <p class="delete-note">O processo cadastrado em Capacidade não será apagado.</p>
    </template>
    <template v-else-if="edge">
      <div class="edge-editor"><small>Conexão selecionada</small><strong>{{ sourceName }} → {{ targetName }}</strong><label><span>Bloco de origem</span><select :value="edge.sourceNodeId" @change="$emit('updateEdge', { sourceNodeId: ($event.target as HTMLSelectElement).value })"><option v-for="item in nodes" :key="item.id" :value="item.id" :disabled="item.id === edge.targetNodeId">{{ item.label }}</option></select></label><label><span>Bloco de destino</span><select :value="edge.targetNodeId" @change="$emit('updateEdge', { targetNodeId: ($event.target as HTMLSelectElement).value })"><option v-for="item in nodes" :key="item.id" :value="item.id" :disabled="item.id === edge.sourceNodeId">{{ item.label }}</option></select></label><label><span>Tipo de fluxo</span><select :value="edge.flowType" @change="$emit('updateEdge', { flowType: ($event.target as HTMLSelectElement).value as LayoutEdge['flowType'] })"><option value="material_push">Fluxo de material</option><option value="material_pull">Material puxado</option><option value="information">Fluxo de informação</option><option value="electronic_information">Informação eletrônica</option></select></label><label><span>Curvatura da linha</span><input type="range" min="-320" max="320" step="5" :value="edge.curveOffset" @change="$emit('updateEdge', { curveOffset: Number(($event.target as HTMLInputElement).value) })" /></label><p class="edge-hint">Arraste o ponto azul da linha no canvas para ajustar a curva diretamente.</p><button class="delete-button" type="button" @click="$emit('delete')"><Link2Off :size="16" /> Desconectar</button></div>
    </template>
    <div v-else class="empty-properties"><strong>Nenhum elemento selecionado</strong><p>Selecione um bloco ou uma conexão para editar suas propriedades.</p></div>
  </aside>
</template>

<style scoped>
.properties-panel{display:flex;width:294px;min-width:294px;flex-direction:column;border-left:1px solid var(--border-subtle);background:#fff}.properties-panel>header{display:flex;min-height:50px;align-items:center;justify-content:space-between;padding:0 15px;border-bottom:1px solid var(--border-subtle);font-size:12px}.properties-panel>header button{display:grid;width:32px;height:32px;place-items:center;border:0;background:transparent;color:var(--text-secondary)}.selected-summary{display:flex;align-items:center;gap:9px;padding:14px 16px;border-bottom:1px solid var(--border-subtle)}.selected-summary .health{width:8px;height:8px;border-radius:50%;background:#2dab5d}.selected-summary div{display:grid}.selected-summary small{color:var(--text-tertiary);font-size:9px}.selected-summary strong{font-size:12px}.property-form{display:grid;gap:11px;padding:14px 16px}.property-form label,.edge-editor label{position:relative;display:grid;gap:5px;color:#53637a;font-size:10px;font-weight:600}.property-form label>span small{font-weight:400}.property-form input,.property-form select,.property-form textarea,.edge-editor select{width:100%;min-height:34px;padding:6px 9px;border:1px solid #d4dce7;border-radius:6px;background:#fff;outline:0;font-size:11px}.property-form input:focus,.property-form select:focus,.property-form textarea:focus{border-color:var(--brand-blue);box-shadow:0 0 0 3px var(--brand-blue-soft)}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:8px}.unit-input{position:relative}.unit-input input{padding-right:25px}.unit-input b{position:absolute;top:8px;right:9px;color:var(--text-tertiary);font-size:10px}.count{position:absolute;right:7px;bottom:5px;color:var(--text-tertiary);font-size:8px}.connections{display:grid;gap:6px;padding-top:6px;border-top:1px solid var(--border-subtle)}.connections h3{margin:0 0 2px;font-size:11px}.connections div{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:5px;padding:7px;border:1px solid var(--border-subtle);border-radius:6px;color:var(--text-secondary);font-size:9px}.connections strong{font-size:9px}.save-properties{width:100%;min-height:36px;font-size:11px}.delete-button{display:flex;min-height:35px;align-items:center;justify-content:center;gap:7px;margin:0 16px;padding:0 10px;border:1px solid #ee9e97;border-radius:6px;background:#fff;color:var(--danger);font-size:10px;font-weight:600}.delete-note{margin:6px 16px 16px;color:var(--text-tertiary);font-size:8px;text-align:center}.edge-editor{display:grid;gap:14px;padding:18px 16px}.edge-editor>small{color:var(--text-tertiary);font-size:9px}.edge-editor>strong{font-size:12px}.edge-editor .delete-button{margin:0}.empty-properties{padding:28px 18px;color:var(--text-secondary);text-align:center}.empty-properties strong{font-size:12px}.empty-properties p{font-size:10px}.properties-panel::-webkit-scrollbar{width:6px}
.edge-editor input[type=range]{width:100%;accent-color:var(--brand-blue)}.edge-hint{margin:0;color:var(--text-tertiary);font-size:9px;line-height:1.4}
.entity-links{display:grid;gap:6px;padding:9px;border:1px solid #cfdbfb;border-radius:7px;background:#f5f8ff}.entity-links a{color:var(--brand-blue);font-size:10px;font-weight:700}.entity-links small{color:var(--text-tertiary);font-size:9px}
@media(max-width:1380px){.properties-panel{position:absolute;z-index:55;top:0;right:0;bottom:0;overflow-y:auto;box-shadow:-12px 0 30px rgba(16,34,62,.14)}}
</style>
