<script setup lang="ts">
import { Activity, Boxes, Calculator, CircleAlert, Clock3, Database, FilePenLine, Gauge, PencilLine, Plus, Save } from "@lucide/vue";
import { storeToRefs } from "pinia";
import DataOriginBadge from "@/components/DataOriginBadge.vue";
import { demoMetrics } from "@/data/demo";
import { useContextStore } from "@/stores/context";
import { useUiStore } from "@/stores/ui";

const context = useContextStore();
const ui = useUiStore();
const { saveStatus } = storeToRefs(ui);

function saveRevision() {
  void ui.saveDemoRevision({
    plantId: context.selectedPlantId,
    scenarioId: context.selectedScenarioId,
    revisionId: context.selectedRevisionId,
    savedAt: new Date().toISOString(),
  });
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div>
        <h1>Visão geral</h1>
        <p>Fundação executável com dados locais identificados.</p>
      </div>
      <div class="page-actions">
        <button class="button button-secondary" type="button">
          <Plus :size="17" aria-hidden="true" />
          Nova revisão
        </button>
        <button class="button button-primary" type="button" :disabled="saveStatus === 'saving'" @click="saveRevision">
          <Save :size="17" aria-hidden="true" />
          {{ saveStatus === "saving" ? "Salvando..." : "Salvar revisão" }}
        </button>
      </div>
    </div>

    <div class="context-banner">
      <span><strong>Modo demonstração local.</strong> A estrutura não consultou o Oracle e não altera o Power BI.</span>
      <DataOriginBadge origin="IMPORT" />
    </div>

    <section class="metric-grid" aria-label="Indicadores de demonstração">
      <article class="card metric-card">
        <div class="metric-icon"><Clock3 :size="23" aria-hidden="true" /></div>
        <div><div class="metric-label">Lead Time total</div><div class="metric-value">{{ demoMetrics.leadTime }}</div><div class="metric-detail">Referência visual · não validado online</div></div>
      </article>
      <article class="card metric-card">
        <div class="metric-icon success"><Activity :size="23" aria-hidden="true" /></div>
        <div><div class="metric-label">VA total</div><div class="metric-value">{{ demoMetrics.valueAdded }}</div><div class="metric-detail">Calculation Engine pendente de paridade</div></div>
      </article>
      <article class="card metric-card">
        <div class="metric-icon warning"><Gauge :size="23" aria-hidden="true" /></div>
        <div><div class="metric-label">Gargalo</div><div class="metric-value">{{ demoMetrics.bottleneck }}</div><div class="metric-detail">Demonstração da hierarquia visual</div></div>
      </article>
      <article class="card metric-card">
        <div class="metric-icon lavender"><Boxes :size="23" aria-hidden="true" /></div>
        <div><div class="metric-label">WIP total</div><div class="metric-value">{{ demoMetrics.totalWip }}</div><div class="metric-detail">Origem real será exibida por ponto</div></div>
      </article>
    </section>

    <section class="panel-grid">
      <article class="card">
        <header class="card-header">
          <div>
            <h2>Contrato de dados da aplicação</h2>
            <span>O visual consome resultados; não contém fórmulas.</span>
          </div>
          <DataOriginBadge origin="MIXED" />
        </header>
        <div class="card-body source-list">
          <div class="source-item">
            <div class="source-symbol input"><PencilLine :size="19" aria-hidden="true" /></div>
            <div><h3>Parâmetros da revisão</h3><p>Volume, turnos, capacidade nominal, limites e metas.</p></div>
            <DataOriginBadge origin="INPUT" compact />
          </div>
          <div class="source-item">
            <div class="source-symbol calculated"><Calculator :size="19" aria-hidden="true" /></div>
            <div><h3>Calculation Engine</h3><p>Dias de estoque, capacidade, utilização e Lead Time versionados.</p></div>
            <DataOriginBadge origin="CALCULATED" compact />
          </div>
          <div class="source-item">
            <div class="source-symbol mes"><Database :size="19" aria-hidden="true" /></div>
            <div><h3>Oracle MES</h3><p>Produção, estoque, paradas e WIP em modo estritamente somente leitura.</p></div>
            <DataOriginBadge origin="ORACLE_MES" compact />
          </div>
        </div>
      </article>

      <article class="card">
        <header class="card-header"><h2>Revisão atual</h2><span class="status-pill warning">Rascunho</span></header>
        <div class="card-body revision-summary">
          <div class="revision-mark">R04</div>
          <div>
            <strong>{{ context.selectedScenario?.name }}</strong>
            <p>{{ context.selectedPlant?.code }} · {{ context.selectedPlant?.name }} · {{ context.selectedScenario?.year }}</p>
          </div>
          <dl>
            <div><dt>Modelo de domínio</dt><dd>17 entidades</dd></div>
            <div><dt>Cartões mapeados</dt><dd>132</dd></div>
            <div><dt>Medidas do Layout</dt><dd>62</dd></div>
            <div><dt>Oracle</dt><dd>Desconectado</dd></div>
          </dl>
        </div>
      </article>
    </section>

    <section class="card foundation-status">
      <header class="card-header"><h2>Checkpoint da fundação</h2><DataOriginBadge origin="INPUT" /></header>
      <div class="card-body status-grid">
        <div><FilePenLine :size="18" aria-hidden="true" /><span><strong>Contexto</strong> Planta, cenário e revisão ativos</span></div>
        <div><Database :size="18" aria-hidden="true" /><span><strong>Persistência</strong> Demo local isolada do MES</span></div>
        <div><Calculator :size="18" aria-hidden="true" /><span><strong>Cálculos</strong> Contrato separado da interface</span></div>
        <div><CircleAlert :size="18" aria-hidden="true" /><span><strong>Próximo</strong> Formulários de Volume e Capacidade</span></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.metric-icon.success { background: var(--success-soft); color: var(--success); }
.metric-icon.warning { background: var(--warning-soft); color: var(--brand-orange); }
.metric-icon.lavender { background: #f1efff; color: #6b5ce7; }
.card-header span { color: var(--text-secondary); font-size: 0.75rem; }
.source-symbol { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 8px; }
.source-symbol.input { background: var(--brand-blue-soft); color: var(--brand-blue); }
.source-symbol.calculated { background: #f0f2f5; color: #59697e; }
.source-symbol.mes { background: var(--success-soft); color: var(--success); }
.revision-summary { display: grid; grid-template-columns: 58px 1fr; gap: 12px; }
.revision-mark { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 50%; background: var(--brand-blue-soft); color: var(--brand-blue); font-weight: 700; }
.revision-summary p { margin: 3px 0 0; color: var(--text-secondary); font-size: 0.75rem; }
.revision-summary dl { grid-column: 1 / -1; display: grid; gap: 0; margin: 6px 0 0; }
.revision-summary dl div { display: flex; justify-content: space-between; padding: 9px 0; border-top: 1px solid var(--border-subtle); font-size: 0.8125rem; }
.revision-summary dt { color: var(--text-secondary); }
.revision-summary dd { margin: 0; font-weight: 600; }
.status-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; padding: 0; background: var(--border-subtle); }
.status-grid > div { display: flex; min-height: 78px; align-items: center; gap: 10px; padding: 16px; background: white; color: var(--brand-blue-strong); }
.status-grid span { display: grid; color: var(--text-secondary); font-size: 0.75rem; }
.status-grid strong { color: var(--text-primary); font-size: 0.8125rem; }
@media (max-width: 980px) { .status-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .status-grid { grid-template-columns: 1fr; } }
</style>
