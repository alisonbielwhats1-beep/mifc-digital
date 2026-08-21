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
    <header><img src="/pbip-layout-resources/Buffer4769535383589081.png" alt="" /><span><strong>{{ buffer.label }}</strong><small>Power BI / OMES · dias</small></span></header>
    <button
      v-for="entry in buffer.values"
      :key="entry.measureKey"
      type="button"
      :aria-label="`Abrir ${entry.measureKey} de ${entry.clientLabel}`"
      :title="`${entry.measureKey} · Oracle/MES + regra Power BI`"
      @click.stop="$emit('select', buffer, entry)"
    >
      <span>{{ entry.clientLabel }}</span>
      <b>{{ entry.value === undefined ? '—' : `${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} d` }}</b>
    </button>
  </section>
</template>

<style scoped>
.layout-measure-buffer{position:absolute;z-index:14;width:148px;padding:7px;border:1px solid #6f8298;border-radius:8px;background:rgba(255,255,255,.98);box-shadow:0 4px 12px rgba(16,34,62,.14)}header{display:grid;grid-template-columns:22px minmax(0,1fr);align-items:center;gap:6px;margin-bottom:5px}header img{width:20px;height:28px;object-fit:contain;filter:brightness(.25)}header span{display:grid;min-width:0;gap:2px}header strong{overflow:hidden;color:#24364d;font-size:9px;text-overflow:ellipsis;white-space:nowrap}header small{color:#16713b;font-size:6px;font-weight:700}button{display:flex;width:100%;min-height:22px;align-items:center;justify-content:space-between;gap:6px;padding:3px 5px;border:0;border-radius:4px;background:transparent;color:#34445a;font-size:8px;cursor:pointer}button:hover,button:focus-visible{outline:0;background:var(--surface-selected);color:var(--brand-blue-strong)}button b{font-size:9px;font-variant-numeric:tabular-nums}
</style>
