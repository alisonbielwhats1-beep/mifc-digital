<script setup lang="ts">
import type { LayoutMeasureBufferValue, PositionedLayoutMeasureBuffer } from "@/domain/layout-measure-buffers";

defineProps<{ buffer: PositionedLayoutMeasureBuffer }>();
defineEmits<{ select: [buffer: PositionedLayoutMeasureBuffer, value: LayoutMeasureBufferValue] }>();
</script>

<template>
  <section
    class="layout-measure-buffer"
    :style="{ left: `${buffer.x}px`, top: `${buffer.y}px` }"
    :data-testid="`layout-measure-buffer-${buffer.id}`"
    :aria-label="`${buffer.label}. Valores automáticos em dias`"
  >
    <header><img src="/pbip-layout-resources/Buffer4769535383589081.png" alt="" /><strong>{{ buffer.label }}</strong></header>
    <button
      v-for="entry in buffer.values"
      :key="entry.measureKey"
      type="button"
      :aria-label="`Abrir ${entry.measureKey} de ${entry.clientLabel}`"
      :title="`${entry.measureKey} · Oracle/MES + regra Power BI`"
      @click.stop="$emit('select', buffer, entry)"
    >
      <span>{{ entry.clientLabel }}</span>
      <b>{{ entry.value === undefined ? '—' : `${entry.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} d` }}</b>
    </button>
  </section>
</template>

<style scoped>
.layout-measure-buffer{position:absolute;z-index:14;width:124px;padding:5px;border:1px solid #718096;border-radius:6px;background:rgba(255,255,255,.97);box-shadow:0 3px 9px rgba(16,34,62,.13)}header{display:grid;grid-template-columns:20px minmax(0,1fr);align-items:center;gap:4px;margin-bottom:3px}header img{width:18px;height:24px;object-fit:contain;filter:brightness(.25)}header strong{overflow:hidden;color:#24364d;font-size:8px;text-overflow:ellipsis;white-space:nowrap}button{display:flex;width:100%;min-height:18px;align-items:center;justify-content:space-between;gap:4px;padding:2px 4px;border:0;border-radius:3px;background:transparent;color:#34445a;font-size:7px;cursor:pointer}button:hover,button:focus-visible{outline:0;background:var(--surface-selected);color:var(--brand-blue-strong)}button b{font-size:8px}
</style>
