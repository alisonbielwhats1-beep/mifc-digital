<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { AlertTriangle, Calculator, Database, GitBranch, X } from "@lucide/vue";
import MeasureLineageTree from "@/components/layout/MeasureLineageTree.vue";
import type { LayoutValueTrace } from "@/domain/layout-value-lineage";
import type { CalculationLineageNode, MeasureLineageEntry } from "@/domain/measure-lineage";
import type { BufferFormRow, CapacityFormRow, LogisticsFormRow, VolumeFormRow } from "@/stores/mifc-forms";

const props = defineProps<{ trace: LayoutValueTrace; editableBuffer?: BufferFormRow; editableVolume?: VolumeFormRow; editableLogistics?: LogisticsFormRow; editableCapacity?: CapacityFormRow; lineageCatalog?: Record<string, MeasureLineageEntry>; lineageValues?: Record<string, number> }>();
const emit = defineEmits<{ close: []; updateBuffer: [id: string, patch: Partial<BufferFormRow>]; updateVolume: [id: string, patch: Partial<VolumeFormRow>]; updateLogistics: [id: string, patch: Partial<LogisticsFormRow>]; updateCapacity: [id: string, patch: Partial<CapacityFormRow>] }>();
const draft = reactive({ quantityPieces: 0, capacityPieces: 0, pairsPerDay: 0, inputProcess: "", outputProcess: "" });
const volumeDraft = reactive({ vehiclesPerDay: 0, reinforcementPercent: 0, workingDays: 0, shifts: 0 });
const logisticsDraft = reactive({ transportHours: 0, beneficiatorDays: 0, movementMinutes: 0 });
const capacityDraft = reactive({ cycleTimeMode: "manual" as CapacityFormRow["cycleTimeMode"], cycleTimeSeconds: 0, nominalCapacityPerHour: 0, availableHoursPerDay: 0, efficiencyPercent: 0, targetWipPieces: 0 });

const traceInputMap = computed(() => new Map(props.trace.inputs.map((input) => [input.key, input])));
const catalogEntries = computed(() => Object.values(props.lineageCatalog ?? {}));

function catalogEntry(key: string): MeasureLineageEntry | undefined {
  const direct = props.lineageCatalog?.[key];
  if (direct) return direct;
  const normalized = key.toLocaleLowerCase("pt-BR");
  return catalogEntries.value.find((entry) => entry.measure.toLocaleLowerCase("pt-BR") === normalized);
}

function buildLineageNode(key: string, path: Set<string>): CalculationLineageNode {
  const input = traceInputMap.value.get(key);
  const entry = catalogEntry(key);
  const nextPath = new Set(path).add(key.toLocaleLowerCase("pt-BR"));
  const dependencies = entry?.dependencies ?? [];
  const children = dependencies
    .filter((dependency) => !nextPath.has(dependency.toLocaleLowerCase("pt-BR")))
    .map((dependency) => buildLineageNode(dependency, nextPath));
  return {
    id: `lineage-${key}-${path.size}`,
    key,
    label: entry?.description || input?.label || key,
    description: entry?.description || (input ? "Entrada usada diretamente na medida selecionada." : undefined),
    formula: entry?.formula || undefined,
    value: input?.value ?? props.lineageValues?.[key],
    textValue: input?.textValue,
    unit: input?.unit,
    origin: input?.origin || entry?.sourceClass,
    source: entry?.directTables.join(", "),
    children,
  };
}

const lineageNodes = computed<CalculationLineageNode[]>(() => {
  if (props.trace.lineageSteps?.length) return props.trace.lineageSteps;
  const selectedKeys = [...new Set(props.trace.measureKeys.filter(Boolean))];
  const dependenciesInSelection = new Set(selectedKeys.flatMap((key) => catalogEntry(key)?.dependencies ?? []).map((key) => key.toLocaleLowerCase("pt-BR")));
  const roots = selectedKeys.filter((key) => !dependenciesInSelection.has(key.toLocaleLowerCase("pt-BR")));
  return (roots.length ? roots : selectedKeys).slice(0, 8).map((key) => buildLineageNode(key, new Set()));
});

watch(() => props.editableBuffer, (buffer) => {
  if (!buffer) return;
  Object.assign(draft, {
    quantityPieces: buffer.quantityPieces,
    capacityPieces: buffer.capacityPieces,
    pairsPerDay: buffer.pairsPerDay,
    inputProcess: buffer.inputProcess,
    outputProcess: buffer.outputProcess,
  });
}, { immediate: true, deep: true });
watch(() => props.editableVolume, (volume) => {
  if (!volume) return;
  Object.assign(volumeDraft, {
    vehiclesPerDay: volume.vehiclesPerDay,
    reinforcementPercent: volume.reinforcementPercent,
    workingDays: volume.workingDays,
    shifts: volume.shifts,
  });
}, { immediate: true, deep: true });
watch(() => props.editableLogistics, (logistics) => {
  if (!logistics) return;
  Object.assign(logisticsDraft, {
    transportHours: logistics.transportHours,
    beneficiatorDays: logistics.beneficiatorDays,
    movementMinutes: logistics.movementMinutes,
  });
}, { immediate: true, deep: true });
watch(() => props.editableCapacity, (capacity) => {
  if (!capacity) return;
  Object.assign(capacityDraft, {
    cycleTimeMode: capacity.cycleTimeMode,
    cycleTimeSeconds: capacity.cycleTimeSeconds,
    nominalCapacityPerHour: capacity.nominalCapacityPerHour,
    availableHoursPerDay: capacity.availableHoursPerDay,
    efficiencyPercent: capacity.efficiencyPercent,
    targetWipPieces: capacity.targetWipPieces,
  });
}, { immediate: true, deep: true });

const canEdit = computed(() => props.editableBuffer?.origin === "INPUT");
function updateBuffer() {
  if (!props.editableBuffer || !canEdit.value) return;
  emit("updateBuffer", props.editableBuffer.id, { ...draft });
}
function updateVolume() {
  if (!props.editableVolume) return;
  emit("updateVolume", props.editableVolume.id, { ...volumeDraft });
}
function updateLogistics() {
  if (!props.editableLogistics) return;
  emit("updateLogistics", props.editableLogistics.id, { ...logisticsDraft });
}
function updateCapacity() {
  if (!props.editableCapacity) return;
  emit("updateCapacity", props.editableCapacity.id, { ...capacityDraft });
}
</script>

<template>
  <aside class="trace-panel" role="dialog" aria-label="Rastreabilidade do valor" aria-modal="false">
    <header><div><small>RASTREABILIDADE</small><strong>{{ trace.title }}</strong></div><button type="button" aria-label="Fechar rastreabilidade" @click="$emit('close')"><X :size="18" /></button></header>
    <div class="trace-scroll">
      <section class="value-card" :class="{ pending: trace.missingKeys.length }"><span>Valor final</span><strong>{{ trace.displayValue }}</strong><small>{{ trace.unit }}</small></section>
      <p v-if="trace.missingKeys.length" class="pending-note"><AlertTriangle :size="15" /> Sem dado confiável para: {{ trace.missingKeys.join(', ') }}. O valor não foi completado com zero.</p>

      <section v-if="lineageNodes.length" class="trace-section hierarchy-section"><h3><GitBranch :size="15" /> Hierarquia do cálculo</h3><p class="lineage-intro">Abra cada etapa para ver de onde vem a medida, quais medidas ela usa e quais filtros entram na composição.</p><MeasureLineageTree :nodes="lineageNodes" /></section>
      <section class="trace-section"><h3><Calculator :size="15" /> Regra técnica</h3><code>{{ trace.formula }}</code><p>{{ trace.simpleExplanation }}</p></section>
      <section class="trace-section"><h3>Entradas utilizadas</h3><div class="input-list"><article v-for="input in trace.inputs" :key="input.key"><div><strong>{{ input.label }}</strong><small>{{ input.key }} · {{ input.origin }}</small></div><b>{{ input.value === undefined ? (input.textValue || '—') : input.value.toLocaleString('pt-BR', { maximumFractionDigits: 8 }) }} {{ input.unit }}</b></article></div></section>
      <section v-if="trace.intermediateResults.length" class="trace-section"><h3>Resultados intermediários</h3><ol><li v-for="result in trace.intermediateResults" :key="result">{{ result }}</li></ol></section>

      <section v-if="editableBuffer" class="trace-section edit-section"><h3>Parâmetros do buffer</h3><p v-if="!canEdit">Valor observado bloqueado para edição. Altere apenas na fonte autorizada.</p><div class="edit-grid"><label>WIP (peças)<input v-model.number="draft.quantityPieces" type="number" min="0" :disabled="!canEdit" @input="updateBuffer" /></label><label>Capacidade (peças)<input v-model.number="draft.capacityPieces" type="number" min="0" :disabled="!canEdit" @input="updateBuffer" /></label><label>Pares/dia<input v-model.number="draft.pairsPerDay" type="number" min="0" step=".1" :disabled="!canEdit" @input="updateBuffer" /></label><label>Processo anterior<input v-model.trim="draft.inputProcess" :disabled="!canEdit" @input="updateBuffer" /></label><label>Processo posterior<input v-model.trim="draft.outputProcess" :disabled="!canEdit" @input="updateBuffer" /></label></div></section>
      <section v-if="editableVolume" class="trace-section edit-section"><h3>Parâmetros do cliente</h3><p>Alterações manuais recalculam imediatamente o ritmo dos buffers deste cliente.</p><div class="edit-grid volume-grid"><label>Veículos por dia<input v-model.number.lazy="volumeDraft.vehiclesPerDay" type="number" min="0" step="1" @change="updateVolume" /></label><label>Reforço (%)<input v-model.number.lazy="volumeDraft.reinforcementPercent" type="number" min="0" max="100" step=".1" @change="updateVolume" /></label><label>Dias úteis/ano<input v-model.number.lazy="volumeDraft.workingDays" type="number" min="1" step="1" @change="updateVolume" /></label><label>Turnos<input v-model.number.lazy="volumeDraft.shifts" type="number" min="1" max="4" step="1" @change="updateVolume" /></label></div></section>
      <section v-if="editableLogistics" class="trace-section edit-section"><h3>Parâmetros logísticos</h3><p>Entradas manuais utilizadas diretamente no Lead Time funcional deste cliente.</p><div class="edit-grid volume-grid"><label>Transporte (h)<input v-model.number.lazy="logisticsDraft.transportHours" type="number" min="0" step=".1" @change="updateLogistics" /></label><label>Beneficiador (dias)<input v-model.number.lazy="logisticsDraft.beneficiatorDays" type="number" min="0" step=".1" @change="updateLogistics" /></label><label>Movimentação (min)<input v-model.number.lazy="logisticsDraft.movementMinutes" type="number" min="0" step=".1" @change="updateLogistics" /></label></div></section>
      <section v-if="editableCapacity" class="trace-section edit-section"><h3>Parâmetros da máquina</h3><p>Edite os parâmetros da revisão local. O modo Automático lê somente o MES e não grava nada no banco.</p><div class="edit-grid capacity-edit-grid"><label>Modo do ciclo<select v-model="capacityDraft.cycleTimeMode" @change="updateCapacity"><option value="manual">Manual</option><option value="automatic">Automático (MES)</option></select></label><label>CT manual de reserva (s/unid.)<input v-model.number="capacityDraft.cycleTimeSeconds" type="number" min="0" step=".1" :disabled="capacityDraft.cycleTimeMode === 'automatic'" @input="updateCapacity" /></label><label>Capacidade nominal/h<input v-model.number="capacityDraft.nominalCapacityPerHour" type="number" min="0" step=".1" @input="updateCapacity" /></label><label>Horas disponíveis/dia<input v-model.number="capacityDraft.availableHoursPerDay" type="number" min="0" max="24" step=".1" @input="updateCapacity" /></label><label>Eficiência-meta (%)<input v-model.number="capacityDraft.efficiencyPercent" type="number" min="0" max="100" step=".1" @input="updateCapacity" /></label><label>WIP-meta<input v-model.number="capacityDraft.targetWipPieces" type="number" min="0" step="1" @input="updateCapacity" /></label></div></section>

      <section class="trace-section metadata"><h3><Database :size="15" /> Origem e contexto</h3><dl><div><dt>Origem</dt><dd>{{ trace.origin }}</dd></div><div><dt>Medida / regra</dt><dd>{{ trace.measureKeys.join(', ') || 'Sem medida vinculada' }}</dd></div><div><dt>Cliente</dt><dd>{{ trace.client || 'Contexto geral' }}</dd></div><div><dt>Máquina/processo</dt><dd>{{ trace.process || '—' }}</dd></div><div><dt>Data/período</dt><dd>{{ trace.date }}</dd></div><div><dt>Filtros aplicados</dt><dd>{{ trace.filters.join(' · ') }}</dd></div><div><dt>Última atualização</dt><dd>{{ trace.updatedAt ? new Date(trace.updatedAt).toLocaleString('pt-BR') : 'Sem atualização confiável' }}</dd></div><div><dt>Referência</dt><dd>{{ trace.sourceReference }}</dd></div></dl></section>
    </div>
  </aside>
</template>

<style scoped>
.trace-panel{display:flex;width:390px;min-width:390px;flex-direction:column;border-left:1px solid var(--border-subtle);background:#fff}.trace-panel>header{display:flex;min-height:58px;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border-subtle)}header div{display:grid;gap:2px}header small{color:var(--brand-blue);font-size:8px;font-weight:800;letter-spacing:.08em}header strong{font-size:12px}header button{display:grid;width:34px;height:34px;place-items:center;border:0;border-radius:50%;background:transparent}.trace-scroll{display:grid;gap:12px;overflow-y:auto;padding:14px}.value-card{display:grid;padding:14px;border-radius:9px;background:#eaf8ef;color:#146b37}.value-card.pending{background:#fff6e6;color:#8c5700}.value-card span,.value-card small{font-size:9px}.value-card strong{margin:4px 0;font-size:23px}.trace-section{display:grid;gap:8px;padding:12px;border:1px solid var(--border-subtle);border-radius:8px}.trace-section h3{display:flex;align-items:center;gap:6px;margin:0;font-size:11px}.trace-section code{padding:9px;border-radius:6px;background:#f4f7fb;color:#253b57;font-size:9px;line-height:1.5;white-space:normal}.trace-section p,.trace-section li{margin:0;color:var(--text-secondary);font-size:9px;line-height:1.5}.lineage-intro{font-size:8px!important;line-height:1.45!important}.pending-note{display:flex;align-items:flex-start;gap:7px;margin:0;padding:9px;border-radius:7px;background:#fff6e6;color:#8c5700;font-size:9px}.input-list{display:grid;gap:5px}.input-list article{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px;border-radius:6px;background:#f7f9fc}.input-list article div{display:grid}.input-list strong,.input-list b{font-size:9px}.input-list small{color:var(--text-tertiary);font-size:7px}.input-list b{text-align:right}.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.edit-grid label{display:grid;gap:4px;color:var(--text-secondary);font-size:8px}.edit-grid input{width:100%;min-height:32px;padding:5px 7px;border:1px solid var(--border-subtle);border-radius:5px;font:inherit}.edit-grid label:nth-last-child(-n+2){grid-column:1/-1}.volume-grid label:nth-last-child(-n+2){grid-column:auto}.metadata dl{display:grid;gap:7px;margin:0}.metadata dl div{display:grid;grid-template-columns:105px 1fr;gap:7px}.metadata dt{color:var(--text-tertiary);font-size:8px}.metadata dd{margin:0;overflow-wrap:anywhere;color:var(--text-primary);font-size:8px;font-weight:600}@media(max-width:1380px){.trace-panel{position:absolute;z-index:56;top:0;right:0;bottom:0;box-shadow:-12px 0 30px rgba(16,34,62,.14)}}
.edit-grid select{width:100%;min-height:32px;padding:5px 7px;border:1px solid var(--border-subtle);border-radius:5px;background:#fff;font:inherit}
</style>
