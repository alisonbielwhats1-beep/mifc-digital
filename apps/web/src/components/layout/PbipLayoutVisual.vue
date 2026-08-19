<script setup lang="ts">
import type { PbipLayoutVisual } from "@/stores/pbip-layout";

const props = defineProps<{ visual: PbipLayoutVisual; selected: boolean }>();
const emit = defineEmits<{ select: [id: string]; dragstart: [event: PointerEvent, visual: PbipLayoutVisual]; resizestart: [event: PointerEvent, visual: PbipLayoutVisual] }>();
const assetUrl = (asset: string) => `/pbip-layout-resources/${encodeURIComponent(asset)}`;
function lineCoordinates() {
  const { width, height, angle = 0 } = props.visual;
  if (width > height * 3) return { x1: 0, y1: height / 2, x2: width, y2: height / 2 };
  if (height > width * 3) return { x1: width / 2, y1: 0, x2: width / 2, y2: height };
  return angle === 90 ? { x1: 0, y1: height, x2: width, y2: 0 } : { x1: 0, y1: 0, x2: width, y2: height };
}
</script>

<template>
  <div class="pbip-visual" :class="[`visual-${visual.type}`, { selected }]" :style="{ left:`${visual.x}px`, top:`${visual.y}px`, width:`${visual.width}px`, height:`${visual.height}px`, zIndex: Math.floor(visual.z / 1000) }" role="button" tabindex="0" :aria-label="visual.type === 'card' ? `${visual.measure}: ${visual.value}` : visual.text || visual.asset || visual.shape || visual.type" @click.stop="emit('select',visual.id)" @keydown.enter.prevent.stop="emit('select',visual.id)" @pointerdown.left.stop="emit('dragstart',$event,visual)">
    <img v-if="visual.type === 'image' && visual.asset" :src="assetUrl(visual.asset)" alt="" draggable="false" />
    <svg v-else-if="visual.type === 'shape'" width="100%" height="100%" overflow="visible" aria-hidden="true">
      <line v-if="visual.shape === 'line'" v-bind="lineCoordinates()" :stroke-width="visual.weight || 3" stroke="#252423" />
      <ellipse v-else-if="visual.shape === 'oval'" :cx="visual.width/2" :cy="visual.height/2" :rx="Math.max(1,visual.width/2-(visual.weight||3))" :ry="Math.max(1,visual.height/2-(visual.weight||3))" fill="transparent" stroke="#252423" :stroke-width="visual.weight || 3" />
      <rect v-else :x="visual.weight || 3" :y="visual.weight || 3" :width="Math.max(1,visual.width-2*(visual.weight||3))" :height="Math.max(1,visual.height-2*(visual.weight||3))" fill="transparent" stroke="#252423" :stroke-width="visual.weight || 3" />
    </svg>
    <span v-else-if="visual.type === 'card'" class="pbip-card-value" :title="visual.measure">{{ visual.value }}</span>
    <span v-else class="pbip-text" :style="{ fontSize:`${visual.fontSize || 12}px`, fontWeight:visual.fontWeight || 500, color:visual.color || '#252423', textAlign:(visual.align as 'left'|'center'|'right') || 'center' }">{{ visual.text }}</span>
    <template v-if="selected"><span class="selection-corner top-left"></span><span class="selection-corner top-right"></span><span class="selection-corner bottom-left"></span><button class="resize-corner" type="button" aria-label="Redimensionar visual importado" @pointerdown.stop.prevent="emit('resizestart',$event,visual)"></button></template>
  </div>
</template>

<style scoped>
.pbip-visual{position:absolute;display:grid;place-items:center;user-select:none;touch-action:none;cursor:grab}.pbip-visual:active{cursor:grabbing}.pbip-visual img{width:100%;height:100%;object-fit:fill;pointer-events:none}.pbip-card-value{width:100%;font-family:Arial,sans-serif;font-size:30px;font-variant-numeric:tabular-nums;text-align:center;white-space:nowrap}.pbip-text{display:flex;width:100%;height:100%;align-items:center;justify-content:center;line-height:1.05;white-space:pre-wrap}.pbip-visual.selected{z-index:2000!important;outline:8px solid #2c6eff;outline-offset:4px;background:rgba(44,110,255,.04)}.selection-corner,.resize-corner{position:absolute;width:22px;height:22px;border:5px solid #2c6eff;background:#fff}.top-left{top:-15px;left:-15px}.top-right{top:-15px;right:-15px}.bottom-left{bottom:-15px;left:-15px}.resize-corner{right:-18px;bottom:-18px;padding:0;cursor:nwse-resize}
</style>
