<script setup lang="ts">
import { Building2, Database, FileText, KanbanSquare, PackageOpen, Pause, Truck } from "@lucide/vue";
import type { LayoutNode } from "@/stores/mifc-layout";
import type { CycleTimeStatus } from "@/domain/cycle-time";

const props = defineProps<{
  node: LayoutNode;
  selected: boolean;
  primary: boolean;
  connecting: boolean;
  zoom: number;
  liveMetrics?: { production: number; demand: number; calendarMinutes: number; stopMinutes?: number; netAvailableMinutes?: number };
  cycleMetrics?: { mode: "manual" | "automatic"; value?: number; status: CycleTimeStatus; statusLabel: string; unit: string };
  actionSummary?: { open: number; overdue: number };
  processTimes?: Array<{ key: string; value?: number }>;
  manualValues?: Array<{ label: string; value?: number }>;
}>();
const emit = defineEmits<{ select: [id: string, event: MouseEvent | KeyboardEvent]; dragstart: [event: PointerEvent, node: LayoutNode]; resizestart: [event: PointerEvent, node: LayoutNode]; metricselect: [node: LayoutNode, metric: "cycle" | "capacity" | "production" | "process"] }>();
</script>

<template>
  <div
    class="mifc-node"
    :class="[`type-${node.type}`, { selected, 'connect-mode': connecting, 'machine-card': node.type === 'process', 'machine-auto': cycleMetrics?.mode === 'automatic', 'machine-pending': cycleMetrics?.status !== 'ready' }]"
    :style="{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px`, zIndex: node.layer }"
    :data-node-id="node.id" :data-testid="`layout-node-${node.id}`"
    role="button" tabindex="0" :aria-label="`${node.label}. ${selected ? 'Selecionado' : 'Selecionar bloco'}`"
    :title="liveMetrics ? `${node.label}\nProduzido: ${liveMetrics.production.toLocaleString('pt-BR')} pç\nDemanda: ${liveMetrics.demand.toLocaleString('pt-BR')} pç\nCalendar[Dia_Min]: ${liveMetrics.calendarMinutes.toLocaleString('pt-BR')} min${liveMetrics.stopMinutes === undefined ? '' : `\nParadas programadas: ${liveMetrics.stopMinutes.toLocaleString('pt-BR')} min`}${liveMetrics.netAvailableMinutes === undefined ? '' : `\nTempo disponível líquido: ${liveMetrics.netAvailableMinutes.toLocaleString('pt-BR')} min`}` : node.label"
    @click.stop="emit('select', node.id, $event)" @keydown.enter.prevent.stop="emit('select', node.id, $event)" @pointerdown.left.stop="emit('dragstart', $event, node)"
  >
    <template v-if="node.type === 'process'">
      <span class="node-health" :class="node.properties.availabilityPercent < 70 ? 'risk' : ''"></span>
      <span class="machine-tag">MÁQUINA</span><strong>{{ node.label }}</strong><span class="node-divider"></span>
      <button class="node-metric value-button" type="button" aria-label="Abrir origem do Tempo de Ciclo" @pointerdown.stop @click.stop="emit('metricselect', node, 'cycle')"><span>CT {{ cycleMetrics?.mode === 'automatic' ? 'automático' : 'manual' }}</span><b>{{ cycleMetrics?.value === undefined ? '—' : cycleMetrics.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) }} {{ cycleMetrics?.unit || 's/unid.' }}</b><small>{{ cycleMetrics?.statusLabel }}</small></button>
      <button class="node-submetric value-button" type="button" aria-label="Abrir origem da capacidade por dia" @pointerdown.stop @click.stop="emit('metricselect', node, 'capacity')">{{ node.properties.capacityPerDay || '—' }} pç/dia</button>
      <button v-if="processTimes?.length" class="node-process-time value-button" data-testid="process-time-values" type="button" aria-label="Abrir origem do tempo do processo" @pointerdown.stop @click.stop="emit('metricselect', node, 'process')"><span>Tempo do processo</span><b v-for="entry in processTimes" :key="entry.key">{{ entry.key }} {{ entry.value === undefined ? '—' : `${entry.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} d` }}</b></button>
      <button v-if="liveMetrics" class="node-live-metric value-button" type="button" aria-label="Abrir origem da produção e demanda" @pointerdown.stop @click.stop="emit('metricselect', node, 'production')"><span>Prod. {{ liveMetrics.production.toLocaleString('pt-BR') }} / {{ liveMetrics.demand.toLocaleString('pt-BR') }}</span><small v-if="liveMetrics.netAvailableMinutes !== undefined">Dia_Min {{ liveMetrics.calendarMinutes.toLocaleString('pt-BR') }} · Líq. {{ liveMetrics.netAvailableMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min</small></button>
      <span v-if="actionSummary?.open" class="node-actions" :class="{ overdue: actionSummary.overdue }">{{ actionSummary.overdue ? `${actionSummary.overdue} atrasada(s)` : `${actionSummary.open} ação(ões)` }}</span>
    </template>
    <template v-else-if="node.type === 'storage'">
      <PackageOpen :size="23" /><strong>{{ node.label }}</strong><span>{{ node.properties.wipPieces }} pç</span>
    </template>
    <template v-else-if="node.type === 'stagnation'"><Pause :size="22" /><strong>{{ node.label }}</strong></template>
    <template v-else-if="node.type === 'database'"><Database :size="23" /><strong>{{ node.label }}</strong></template>
    <template v-else-if="node.type === 'customer_supplier'"><Building2 :size="23" /><strong>{{ node.label }}</strong><div v-if="manualValues?.length" class="node-manual-values"><span v-for="entry in manualValues" :key="entry.label"><b>{{ entry.label }}</b> {{ entry.value === undefined ? '—' : `${entry.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} d` }}</span></div></template>
    <template v-else-if="node.type === 'truck'"><Truck :size="25" /><strong>{{ node.label }}</strong></template>
    <template v-else-if="node.type === 'kanban'"><KanbanSquare :size="23" /><strong>{{ node.label }}</strong></template>
    <template v-else><FileText :size="20" /><strong>{{ node.label }}</strong></template>
    <span v-if="selected" class="selection-handle top-left"></span><span v-if="selected" class="selection-handle top-right"></span><span v-if="selected" class="selection-handle bottom-left"></span>
    <button v-if="selected && primary" class="resize-handle" type="button" aria-label="Redimensionar bloco" @pointerdown.stop.prevent="emit('resizestart', $event, node)"></button>
  </div>
</template>

<style scoped>
.mifc-node{position:absolute;display:flex;min-width:0;align-items:center;justify-content:center;gap:5px;padding:8px;border:1.5px solid #546274;background:#fff;color:#14243e;box-shadow:0 2px 5px rgba(16,34,62,.08);font-size:12px;text-align:center;user-select:none;touch-action:none;cursor:grab;container-type:inline-size}.mifc-node:active{cursor:grabbing}.mifc-node.selected{border:2px solid var(--brand-blue);box-shadow:0 0 0 3px rgba(44,110,255,.14),0 8px 22px rgba(16,34,62,.14)}.mifc-node.connect-mode{cursor:crosshair}.mifc-node.connect-mode:hover{border-color:var(--brand-blue);background:#f3f7ff}.mifc-node strong{display:block;max-width:100%;min-width:0;overflow:hidden;font-size:clamp(9px,8cqi,13px);line-height:1.15;overflow-wrap:anywhere;text-overflow:ellipsis;white-space:pre-line}.type-process{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(12px,auto) minmax(18px,auto) 1px auto auto auto;align-content:center;gap:2px;padding:6px 8px;border:2px solid #155eef;background:linear-gradient(145deg,#f8fbff 0%,#edf4ff 100%);box-shadow:0 4px 14px rgba(30,84,180,.16)}.type-process.machine-auto{border-color:#0b8f68;background:linear-gradient(145deg,#f7fffc 0%,#e8fbf3 100%);box-shadow:0 4px 14px rgba(9,143,104,.15)}.type-process.machine-pending{border-style:dashed}.type-process strong{align-self:center}.machine-tag{justify-self:center;padding:2px 6px;border-radius:999px;background:#155eef;color:#fff;font-size:6px;font-weight:800;letter-spacing:.12em}.machine-auto .machine-tag{background:#0b8f68}.machine-pending .machine-tag{background:#a56a00}.node-divider{width:100%;height:1px;background:#b8c0ca}.value-button{max-width:100%;min-height:0;padding:1px 3px;border:0;border-radius:3px;background:transparent;cursor:pointer}.value-button:hover,.value-button:focus-visible{outline:0;background:var(--surface-selected);color:var(--brand-blue-strong)}.node-metric{display:grid;overflow:hidden;font-size:7px;text-overflow:ellipsis;white-space:nowrap}.node-metric span{font-size:7px;font-weight:700}.node-metric b{display:block;font-size:9px}.node-metric small{overflow:hidden;color:#61738d;font-size:6px;text-overflow:ellipsis}.node-submetric{color:#607086;font-size:9px;white-space:nowrap}.node-process-time{display:flex;overflow:hidden;align-items:center;gap:3px;color:#205bd8;font-size:6px;white-space:nowrap}.node-process-time span{font-weight:700}.node-process-time b{font-size:6px}.node-live-metric{display:grid;overflow:hidden;color:#15803d;font-size:8px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.node-live-metric small{font-size:6px;font-weight:600}.node-health{position:absolute;top:7px;right:7px;width:8px;height:8px;border-radius:50%;background:#28a85b}.node-health.risk{background:#e84038}.type-storage{flex-direction:column;border:0;background:transparent;box-shadow:none}.type-storage::before{position:absolute;z-index:-1;inset:4px 12px;background:#fff;border:1.5px solid #546274;clip-path:polygon(0 0,100% 0,82% 100%,18% 100%);content:""}.type-storage span{color:#148344;font-size:10px}.type-database{flex-direction:column;border-radius:50%/18%;background:linear-gradient(#fff,#f9fbfd)}.type-customer_supplier,.type-truck{flex-direction:column}.node-manual-values{display:grid;width:100%;grid-template-columns:1fr 1fr;gap:1px;color:#205bd8;font-size:6px}.node-manual-values span{white-space:nowrap}.node-manual-values b{font-size:6px}.type-information,.type-text{border-style:dashed;background:#fbfcff}.type-stagnation{border-radius:0 35px 35px 0}.selection-handle,.resize-handle{position:absolute;width:8px;height:8px;border:1px solid var(--brand-blue);background:#fff}.top-left{top:-5px;left:-5px}.top-right{top:-5px;right:-5px}.bottom-left{bottom:-5px;left:-5px}.resize-handle{right:-6px;bottom:-6px;width:11px;height:11px;padding:0;cursor:nwse-resize}
.node-actions{position:absolute;right:4px;bottom:3px;padding:2px 4px;border-radius:8px;background:#edf3ff;color:#205bd8;font-size:7px;font-weight:700}.node-actions.overdue{background:#fff0ef;color:#b32922}
.type-process{position:relative;overflow:visible;border-radius:14px;transition:transform 160ms ease,box-shadow 160ms ease;}
.type-process::before{position:absolute;top:0;right:0;left:0;height:5px;background:#155eef;content:"";}
.type-process.machine-auto::before{background:#0b8f68;}
.type-process.machine-pending::before{background:#d2932e;}
.type-process:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(30,84,180,.22);}
.machine-tag{margin-top:2px;font-size:7px;letter-spacing:.14em;}
.machine-auto .machine-tag{background:#0b8f68;}
.machine-pending .machine-tag{background:#b7791f;}
.node-metric b{font-size:10px;}
.node-live-metric{padding:3px 4px;border-top:1px solid rgba(21,94,239,.13);border-radius:5px;background:rgba(255,255,255,.5);}
</style>
