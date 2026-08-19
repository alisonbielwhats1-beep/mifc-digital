<script setup lang="ts">
import { Building2, Database, FileText, KanbanSquare, PackageOpen, Pause, Truck } from "@lucide/vue";
import type { LayoutNode } from "@/stores/mifc-layout";

const props = defineProps<{
  node: LayoutNode;
  selected: boolean;
  connecting: boolean;
  zoom: number;
  liveMetrics?: { production: number; demand: number; stopMinutes?: number };
}>();
const emit = defineEmits<{ select: [id: string]; dragstart: [event: PointerEvent, node: LayoutNode]; resizestart: [event: PointerEvent, node: LayoutNode] }>();
</script>

<template>
  <div
    class="mifc-node"
    :class="[`type-${node.type}`, { selected, 'connect-mode': connecting }]"
    :style="{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px`, zIndex: node.layer }"
    :data-node-id="node.id" :data-testid="`layout-node-${node.id}`"
    role="button" tabindex="0" :aria-label="`${node.label}. ${selected ? 'Selecionado' : 'Selecionar bloco'}`"
    :title="liveMetrics ? `${node.label}\nProduzido: ${liveMetrics.production.toLocaleString('pt-BR')} pç\nDemanda: ${liveMetrics.demand.toLocaleString('pt-BR')} pç${liveMetrics.stopMinutes === undefined ? '' : `\nParadas programadas: ${liveMetrics.stopMinutes.toLocaleString('pt-BR')} min`}` : node.label"
    @click.stop="emit('select', node.id)" @keydown.enter.prevent.stop="emit('select', node.id)" @pointerdown.left.stop="emit('dragstart', $event, node)"
  >
    <template v-if="node.type === 'process'">
      <span class="node-health" :class="node.properties.availabilityPercent < 70 ? 'risk' : ''"></span>
      <strong>{{ node.label }}</strong><span class="node-divider"></span>
      <span class="node-metric">CT: <b>{{ node.properties.cycleTimeSeconds || '—' }}s</b></span>
      <span class="node-submetric">{{ node.properties.capacityPerDay || '—' }} pç/dia</span>
      <span v-if="liveMetrics" class="node-live-metric">Prod. {{ liveMetrics.production.toLocaleString('pt-BR') }} / {{ liveMetrics.demand.toLocaleString('pt-BR') }}</span>
    </template>
    <template v-else-if="node.type === 'storage'">
      <PackageOpen :size="23" /><strong>{{ node.label }}</strong><span>{{ node.properties.wipPieces }} pç</span>
    </template>
    <template v-else-if="node.type === 'stagnation'"><Pause :size="22" /><strong>{{ node.label }}</strong></template>
    <template v-else-if="node.type === 'database'"><Database :size="23" /><strong>{{ node.label }}</strong></template>
    <template v-else-if="node.type === 'customer_supplier'"><Building2 :size="23" /><strong>{{ node.label }}</strong></template>
    <template v-else-if="node.type === 'truck'"><Truck :size="25" /><strong>{{ node.label }}</strong></template>
    <template v-else-if="node.type === 'kanban'"><KanbanSquare :size="23" /><strong>{{ node.label }}</strong></template>
    <template v-else><FileText :size="20" /><strong>{{ node.label }}</strong></template>
    <span v-if="selected" class="selection-handle top-left"></span><span v-if="selected" class="selection-handle top-right"></span><span v-if="selected" class="selection-handle bottom-left"></span>
    <button v-if="selected" class="resize-handle" type="button" aria-label="Redimensionar bloco" @pointerdown.stop.prevent="emit('resizestart', $event, node)"></button>
  </div>
</template>

<style scoped>
.mifc-node{position:absolute;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border:1.5px solid #546274;background:#fff;color:#14243e;box-shadow:0 2px 5px rgba(16,34,62,.08);font-size:11px;text-align:center;user-select:none;touch-action:none;cursor:grab}.mifc-node:active{cursor:grabbing}.mifc-node.selected{border:2px solid var(--brand-blue);box-shadow:0 0 0 3px rgba(44,110,255,.14),0 8px 22px rgba(16,34,62,.14)}.mifc-node.connect-mode{cursor:crosshair}.mifc-node.connect-mode:hover{border-color:var(--brand-blue);background:#f3f7ff}.mifc-node strong{overflow:hidden;text-overflow:ellipsis}.type-process{display:grid;grid-template-columns:1fr;grid-template-rows:1fr 1px auto auto auto;padding:6px 9px}.type-process strong{align-self:end;font-size:11px}.node-divider{width:100%;height:1px;background:#b8c0ca}.node-metric{font-size:10px}.node-submetric{color:#607086;font-size:9px}.node-live-metric{color:#15803d;font-size:8px;font-weight:700}.node-health{position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:50%;background:#28a85b}.node-health.risk{background:#e84038}.type-storage{flex-direction:column;border:0;background:transparent;box-shadow:none}.type-storage::before{position:absolute;z-index:-1;inset:4px 12px;background:#fff;border:1.5px solid #546274;clip-path:polygon(0 0,100% 0,82% 100%,18% 100%);content:""}.type-storage span{color:#148344;font-size:9px}.type-database{flex-direction:column;border-radius:50%/18%;background:linear-gradient(#fff,#f9fbfd)}.type-customer_supplier,.type-truck{flex-direction:column}.type-information,.type-text{border-style:dashed;background:#fbfcff}.type-stagnation{border-radius:0 35px 35px 0}.selection-handle,.resize-handle{position:absolute;width:8px;height:8px;border:1px solid var(--brand-blue);background:#fff}.top-left{top:-5px;left:-5px}.top-right{top:-5px;right:-5px}.bottom-left{bottom:-5px;left:-5px}.resize-handle{right:-6px;bottom:-6px;width:11px;height:11px;padding:0;cursor:nwse-resize}
.mifc-node strong{white-space:pre-line}
</style>
