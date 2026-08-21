<script setup lang="ts">
import { Info } from "@lucide/vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";
</script>

<template>
  <aside class="card source-panel">
    <header class="card-header"><h2>Entenda os dados</h2><Info :size="18" aria-hidden="true" /></header>
    <div class="card-body source-items">
      <div><DataOriginBadge origin="INPUT" /><p>Campos do cenário que podem ser preenchidos e alterados.</p></div>
      <div><DataOriginBadge origin="CALCULATED" /><p>Resultados de fórmulas confirmadas. São somente leitura.</p></div>
      <div><DataOriginBadge origin="ORACLE_MES" /><p>Dados operacionais do MES. Fora da rede, exibem o estado de espera.</p></div>
      <div><DataOriginBadge origin="IMPORT" /><p>Referência importada ainda aguardando validação de paridade.</p></div>
    </div>
    <div class="source-note"><slot /></div>
  </aside>
</template>

<style scoped>
.source-panel { align-self: start; position: sticky; top: calc(var(--header-height) + 18px); }
.source-panel .card-header svg { color: var(--brand-blue); }
.source-items { display: grid; gap: 16px; }
.source-items > div { display: grid; gap: 7px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle); }
.source-items p, .source-note :deep(p) { margin: 0; color: var(--text-secondary); font-size: .76rem; }
.source-note { margin: 0 18px 18px; padding: 13px; border-radius: var(--radius-md); background: var(--brand-blue-soft); }
.source-note :deep(strong) { display: block; margin-bottom: 4px; color: var(--brand-blue-strong); font-size: .8rem; }
@media (max-width: 1180px) { .source-panel { position: static; } }
</style>
