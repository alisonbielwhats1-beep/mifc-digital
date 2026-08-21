<script setup lang="ts">
import { ChevronDown, GitBranch } from "@lucide/vue";
import { ref } from "vue";
import type { CalculationLineageNode } from "@/domain/measure-lineage";

defineProps<{ nodes: CalculationLineageNode[]; level?: number }>();
const collapsed = ref<Set<string>>(new Set());

function toggle(node: CalculationLineageNode): void {
  if (!node.children.length) return;
  if (collapsed.value.has(node.id)) collapsed.value.delete(node.id);
  else collapsed.value.add(node.id);
  collapsed.value = new Set(collapsed.value);
}

function displayValue(node: CalculationLineageNode): string {
  if (node.value !== undefined && Number.isFinite(node.value)) return node.value.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
  return node.textValue || "—";
}
</script>

<template>
  <ul class="lineage-tree" :class="{ nested: (level ?? 0) > 0 }">
    <li v-for="node in nodes" :key="node.id">
      <article class="lineage-node" :class="{ root: (level ?? 0) === 0, muted: node.value === undefined && !node.textValue }">
        <button v-if="node.children.length" class="lineage-toggle" type="button" :aria-label="collapsed.has(node.id) ? `Expandir ${node.label}` : `Recolher ${node.label}`" @click="toggle(node)">
          <ChevronDown :size="13" :class="{ collapsed: collapsed.has(node.id) }" />
        </button>
        <span v-else class="lineage-leaf"><GitBranch :size="11" /></span>
        <div class="lineage-copy">
          <div class="lineage-title"><strong>{{ node.label }}</strong><code v-if="node.key">{{ node.key }}</code></div>
          <div class="lineage-value"><b>{{ displayValue(node) }}</b><small v-if="node.unit">{{ node.unit }}</small><em v-if="node.origin">{{ node.origin }}</em></div>
          <p v-if="node.description">{{ node.description }}</p>
          <code v-if="node.formula" class="lineage-formula">{{ node.formula }}</code>
          <small v-if="node.source" class="lineage-source">Fonte: {{ node.source }}</small>
        </div>
      </article>
      <MeasureLineageTree v-if="node.children.length && !collapsed.has(node.id)" :nodes="node.children" :level="(level ?? 0) + 1" />
    </li>
  </ul>
</template>

<style scoped>
.lineage-tree{display:grid;gap:7px;margin:0;padding:0;list-style:none}.lineage-tree.nested{position:relative;margin:4px 0 0 10px;padding-left:12px}.lineage-tree.nested::before{position:absolute;top:0;bottom:7px;left:1px;border-left:1px solid #cdd9e8;content:""}.lineage-node{position:relative;display:grid;grid-template-columns:20px 1fr;gap:6px;padding:8px 8px 8px 5px;border:1px solid #e1e8f0;border-radius:7px;background:#fbfcfe}.lineage-node.root{border-color:#bcd5f0;background:#f4f8fd}.lineage-node.muted{background:#fffdf8}.lineage-toggle,.lineage-leaf{display:grid;width:20px;height:20px;place-items:center;border:0;border-radius:5px;background:#e8f1fb;color:#2862a3}.lineage-toggle{cursor:pointer}.lineage-toggle svg{transition:transform .16s ease}.lineage-toggle svg.collapsed{transform:rotate(-90deg)}.lineage-leaf{background:#eef5ef;color:#267345}.lineage-copy{display:grid;gap:4px;min-width:0}.lineage-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.lineage-title strong{font-size:9px;line-height:1.25}.lineage-title code{flex:0 0 auto;color:#52708e;font-size:7px}.lineage-value{display:flex;align-items:baseline;gap:5px}.lineage-value b{color:#153b63;font-size:10px}.lineage-value small{color:#526170;font-size:8px}.lineage-value em{margin-left:auto;color:#6f7f91;font-size:7px;font-style:normal;text-transform:uppercase}.lineage-copy p{margin:0;color:#536273;font-size:8px;line-height:1.4}.lineage-formula{display:block;max-height:100px;overflow:auto;padding:5px;border-radius:5px;background:#edf3f9;color:#2e4c6c;font-size:7px;line-height:1.4;white-space:pre-wrap}.lineage-source{color:#7a8998;font-size:7px;line-height:1.3}@media(prefers-reduced-motion:reduce){.lineage-toggle svg{transition:none}}
</style>
