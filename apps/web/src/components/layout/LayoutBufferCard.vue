<script setup lang="ts">
import type { PositionedLayoutBuffer } from "@/domain/layout-buffers";

defineProps<{ buffer: PositionedLayoutBuffer }>();
defineEmits<{ select: [buffer: PositionedLayoutBuffer] }>();
</script>

<template>
  <button
    class="layout-buffer"
    type="button"
    :style="{ left: `${buffer.x}px`, top: `${buffer.y}px` }"
    :data-testid="`layout-buffer-${buffer.id}`"
    :aria-label="`Buffer ${buffer.point}. Abrir valor e origem`"
    :title="`${buffer.point}\n${buffer.inputProcess || 'Origem pendente'} → ${buffer.outputProcess || 'Destino pendente'}`"
    @click.stop="$emit('select', buffer)"
  >
    <img src="/pbip-layout-resources/Buffer4769535383589081.png" alt="" />
    <span><strong>{{ buffer.point }}</strong><i>Manual · peças</i><small>{{ buffer.quantityPieces === null ? '—' : `${buffer.quantityPieces.toLocaleString('pt-BR')} pç` }}</small><em>{{ buffer.wipDays === undefined ? 'Sem tempo confiável' : `${buffer.wipDays.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} dia` }}</em></span>
  </button>
</template>

<style scoped>
.layout-buffer{position:absolute;z-index:13;display:grid;width:96px;min-height:72px;grid-template-columns:24px 1fr;align-items:center;gap:5px;padding:5px;border:1px solid #b47b24;border-radius:6px;background:rgba(255,250,239,.98);color:#263746;text-align:left;box-shadow:0 3px 9px rgba(16,34,62,.12);cursor:pointer}.layout-buffer:hover,.layout-buffer:focus-visible{border-color:var(--brand-blue);outline:0;box-shadow:0 0 0 3px var(--focus-ring),0 5px 14px rgba(16,34,62,.14)}img{width:22px;height:32px;object-fit:contain;filter:brightness(.25)}span,strong,small,em,i{display:block;min-width:0}strong{overflow:hidden;font-size:8px;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}i{margin-top:1px;color:#9a6208;font-size:5.5px;font-style:normal;font-weight:700}small{margin-top:2px;color:#157a3c;font-size:8px;font-weight:700}em{margin-top:1px;color:var(--text-tertiary);font-size:6px;font-style:normal}
</style>
