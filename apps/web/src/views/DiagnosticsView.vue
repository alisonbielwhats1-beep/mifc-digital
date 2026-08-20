<script setup lang="ts">
import { Activity, Calculator, Database, Network, Route, Settings2 } from "@lucide/vue";
import { computed, onMounted } from "vue";
import { useMifcFormsStore } from "@/stores/mifc-forms";
import { useMifcLayoutStore } from "@/stores/mifc-layout";
import { useOperationsStore } from "@/stores/operations";

const forms = useMifcFormsStore();
const layout = useMifcLayoutStore();
const operations = useOperationsStore();
const activeRows = computed(() => forms.volumeRows.length + forms.logisticsRows.length + forms.bufferRows.length + forms.capacityRows.length);

onMounted(() => {
  layout.hydrate();
  forms.hydrate(layout.activeRevisionId);
  operations.hydrate();
});
</script>

<template>
  <main class="page diagnostics-page">
    <header class="page-heading"><div><p class="eyebrow">ÁREA TÉCNICA</p><h1>Diagnóstico</h1><p>Estrutura, cobertura e estado interno separados da operação diária.</p></div><RouterLink class="button button-secondary" to="/integrations"><Database :size="16"/>Abrir integrações</RouterLink></header>
    <section class="diagnostic-grid">
      <article class="card"><Network :size="21"/><span>Layout ativo</span><strong>{{ layout.activeRevision.nodes.length }} blocos</strong><small>{{ layout.activeRevision.edges.length }} conexões</small></article>
      <article class="card"><Calculator :size="21"/><span>Semantic Model</span><strong>309 medidas</strong><small>62 utilizadas no Layout catalogado</small></article>
      <article class="card"><Route :size="21"/><span>Rotas técnicas</span><strong>{{ operations.processes.length }} processos</strong><small>VM × Mesa 3 continua pendente</small></article>
      <article class="card"><Settings2 :size="21"/><span>Parâmetros ativos</span><strong>{{ activeRows }} linhas</strong><small>Volume, logística, buffers e capacidade</small></article>
    </section>
    <section class="card diagnostic-detail"><header><Activity :size="20"/><div><h2>Estado de paridade</h2><p>A aplicação não declara paridade integral enquanto os Golden Cases não forem comparados no mesmo snapshot MES/Power BI.</p></div></header><dl><div><dt>Produção observada</dt><dd>Validada por LOCATION_DATE no snapshot registrado</dd></div><div><dt>Slitter</dt><dd>Fórmula PBIP reproduzida; comparação visual no mesmo refresh ainda necessária</dd></div><div><dt>Lead Time funcional</dt><dd>LT-TOTAL-* separado das medidas T-T-* originais</dd></div><div><dt>Oracle</dt><dd>Somente leitura; estado operacional em Integrações</dd></div></dl></section>
  </main>
</template>

<style scoped>
.diagnostics-page{display:grid;gap:16px}.eyebrow{margin:0 0 5px;color:var(--brand-blue);font-size:9px;font-weight:800;letter-spacing:.08em}.diagnostic-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.diagnostic-grid article{display:grid;gap:6px;padding:18px}.diagnostic-grid svg{color:var(--brand-blue)}.diagnostic-grid span,.diagnostic-grid small{color:var(--text-secondary);font-size:10px}.diagnostic-grid strong{font-size:18px}.diagnostic-detail>header{display:flex;align-items:flex-start;gap:10px;padding:18px}.diagnostic-detail h2,.diagnostic-detail p{margin:0}.diagnostic-detail p{margin-top:5px;color:var(--text-secondary);font-size:11px}.diagnostic-detail dl{margin:0}.diagnostic-detail dl div{display:grid;grid-template-columns:190px 1fr;gap:12px;padding:12px 18px;border-top:1px solid var(--border-subtle);font-size:11px}.diagnostic-detail dt{color:var(--text-secondary)}.diagnostic-detail dd{margin:0;font-weight:600}@media(max-width:950px){.diagnostic-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.diagnostic-grid{grid-template-columns:1fr}.diagnostic-detail dl div{grid-template-columns:1fr}}
</style>
