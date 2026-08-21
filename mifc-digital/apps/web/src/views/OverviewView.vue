<script setup lang="ts">
import { Activity, AlertTriangle, Boxes, CheckCircle2, Clock3, Cog, Database, Gauge, GitBranch, RefreshCw, Save, ShieldCheck, TimerOff, TrendingUp } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";
import { clientProcessLanes } from "@/domain/client-process-matrix";
import { summarizeExecutiveOverview } from "@/domain/executive-overview";
import { calculateLayoutProcessMeasures } from "@/domain/layout-process-measures";
import { calculateClientTotal } from "@/domain/layout-value-lineage";
import { useContextStore } from "@/stores/context";
import { useMifcFormsStore } from "@/stores/mifc-forms";
import { useMifcLayoutStore } from "@/stores/mifc-layout";
import { useOperationsStore } from "@/stores/operations";
import { useUiStore } from "@/stores/ui";

interface MeasureResponse {
  ready: boolean;
  values: Record<string, number> | null;
  updatedAt: string | null;
  diagnostics?: { operationalReady?: Record<string, boolean> };
}
interface SyncResponse { connected: boolean; lastSyncedAt: string | null }

const context = useContextStore();
const forms = useMifcFormsStore();
const layout = useMifcLayoutStore();
const operations = useOperationsStore();
const ui = useUiStore();
const measures = ref<MeasureResponse>({ ready: false, values: null, updatedAt: null });
const sync = ref<SyncResponse>({ connected: false, lastSyncedAt: null });
const loading = ref(false);
const apiOffline = ref(false);

const availableMinutes = (id: string) => (forms.capacityRows.find((row) => row.id === id)?.availableHoursPerDay ?? 0) * 60;
const processValues = computed(() => calculateLayoutProcessMeasures(measures.value.values, {
  rf3: availableMinutes("cap-rf3"), beatty1: availableMinutes("cap-beatty"), beatty2: availableMinutes("cap-beatty-2"), beatty3: availableMinutes("cap-beatty-3"), beatty4: availableMinutes("cap-beatty-4"),
  lct: availableMinutes("cap-lct"), pa: availableMinutes("cap-pa"), cnc: availableMinutes("cap-cnc"), paint: availableMinutes("cap-paint"), stenhoj: availableMinutes("cap-stenhoj"),
}));
const totals = computed(() => clientProcessLanes.map((lane) => {
  const logistics = forms.logisticsRows.find((row) => row.customer === lane.label && row.status === "active");
  return calculateClientTotal(lane.key, measures.value.values, {
    transportHours: logistics?.transportHours,
    beneficiatorDays: logistics?.beneficiatorDays,
    movementMinutes: logistics?.movementMinutes,
    processValues: processValues.value,
  });
}));
const capacityDemandKeys: Record<string, string> = {
  "cap-rf3": "D-P-RF3", "cap-beatty": "D-P-B1", "cap-beatty-2": "D-P-B2", "cap-beatty-3": "D-P-B3", "cap-beatty-4": "D-P-B4",
  "cap-pa": "D-P-P.A", "cap-cnc": "D-P-CNC", "cap-paint": "D-P-LPP2", "cap-stenhoj": "D-P-STJ",
};
const summary = computed(() => summarizeExecutiveOverview({
  clientTotals: totals.value,
  buffers: forms.bufferRows,
  measureValues: measures.value.values,
  productionReady: Boolean(measures.value.diagnostics?.operationalReady?.producao),
  capacityCandidates: forms.capacityRows.map((row) => ({ label: row.process, capacityPerDay: row.referenceCapacityPerDay, demandPerDay: measures.value.values?.[capacityDemandKeys[row.id]], cycleTimeMode: row.cycleTimeMode })),
  connected: sync.value.connected,
  lastUpdatedAt: sync.value.lastSyncedAt ?? measures.value.updatedAt,
  overdueActions: operations.actionSummary.overdue,
}));
const clientLabels = Object.fromEntries(clientProcessLanes.map((lane) => [lane.key, lane.label]));

function number(value: number | undefined, decimals = 2) {
  return value === undefined ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: decimals });
}
function days(value: number | undefined) { return value === undefined ? "—" : `${number(value, 3)} dias`; }
function missing(value: number | undefined) { return value === undefined ? "Sem dado confiável" : "Mesmo contexto da revisão ativa"; }

async function refresh() {
  loading.value = true;
  const [measureResult, syncResult] = await Promise.allSettled([
    fetch("/api/layout/measures", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error();
      return await response.json() as MeasureResponse;
    }),
    fetch("/api/oracle/sync-status", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error();
      return await response.json() as SyncResponse;
    }),
  ]);
  if (measureResult.status === "fulfilled") measures.value = measureResult.value;
  if (syncResult.status === "fulfilled") sync.value = syncResult.value;
  apiOffline.value = measureResult.status === "rejected" && syncResult.status === "rejected";
  loading.value = false;
}
async function saveRevision() {
  layout.save();
  forms.save();
  await ui.saveDemoRevision({ plantId: context.selectedPlantId, scenarioId: context.selectedScenarioId, revisionId: layout.activeRevisionId, savedAt: new Date().toISOString() });
}
function createRevision() {
  const sourceRevisionId = layout.activeRevisionId;
  layout.createRevision();
  forms.cloneRevision(sourceRevisionId, layout.activeRevisionId);
  context.selectedRevisionId = layout.activeRevisionId;
  context.persist();
}

onMounted(() => {
  context.hydrate();
  layout.hydrate();
  forms.hydrate(layout.activeRevisionId);
  operations.hydrate();
  void refresh();
});
</script>

<template>
  <main class="page overview-page">
    <header class="page-heading"><div><p class="eyebrow">OPERAR</p><h1>Visão Geral</h1><p>Indicadores de negócio da planta, cenário e revisão ativos.</p></div><div class="page-actions"><button class="button button-secondary" type="button" @click="createRevision">Nova revisão</button><button class="button button-primary" type="button" @click="saveRevision"><Save :size="16"/>Salvar revisão</button></div></header>

    <div class="context-banner" :class="{ warning: summary.connection.state === 'offline' }"><span><strong>{{ context.selectedPlant?.name }} · {{ context.selectedScenario?.name }} · {{ layout.activeRevision.label }}</strong><small v-if="apiOffline">API local indisponível. Valores operacionais permanecem sem dado.</small><small v-else-if="!sync.connected">MES desconectado; parâmetros locais continuam disponíveis.</small><small v-else>MES conectado · atualização {{ summary.connection.lastUpdatedAt ? new Date(summary.connection.lastUpdatedAt).toLocaleString('pt-BR') : 'pendente' }}</small></span><button type="button" :disabled="loading" aria-label="Atualizar indicadores" @click="refresh"><RefreshCw :size="16" :class="{ spinning: loading }"/></button></div>

    <section class="metric-grid executive-metrics" aria-label="Indicadores executivos">
      <article class="card metric-card"><div class="metric-icon"><Clock3 :size="22"/></div><div><div class="metric-label">Lead Time</div><div class="metric-value">{{ days(summary.leadTime.value) }}</div><div class="metric-detail">{{ summary.leadTime.clientKey ? `Maior rota completa · ${clientLabels[summary.leadTime.clientKey]}` : 'Nenhuma rota fechada sem lacunas' }}</div></div><DataOriginBadge origin="CALCULATED" compact/></article>
      <article class="card metric-card"><div class="metric-icon success"><Activity :size="22"/></div><div><div class="metric-label">VA</div><div class="metric-value">{{ days(summary.valueAdded.value) }}</div><div class="metric-detail">Só tempo de máquina da rota escolhida</div></div><DataOriginBadge origin="CALCULATED" compact/></article>
      <article class="card metric-card"><div class="metric-icon warning"><TimerOff :size="22"/></div><div><div class="metric-label">NVA</div><div class="metric-value">{{ days(summary.nonValueAdded.value) }}</div><div class="metric-detail">Lead Time − VA, sem preencher dados ausentes</div></div><DataOriginBadge origin="CALCULATED" compact/></article>
      <article class="card metric-card"><div class="metric-icon warning"><Gauge :size="22"/></div><div><div class="metric-label">Gargalo planejado</div><div class="metric-value text-value">{{ summary.bottleneck.label ?? '—' }}</div><div class="metric-detail">{{ summary.bottleneck.utilizationPercent === undefined ? 'Capacidade ou demanda ainda pendente' : `${number(summary.bottleneck.utilizationPercent, 1)}% de utilização` }}</div></div><DataOriginBadge origin="MIXED" compact/></article>
      <article class="card metric-card"><div class="metric-icon lavender"><Boxes :size="22"/></div><div><div class="metric-label">WIP cadastrado</div><div class="metric-value">{{ summary.wip.value === undefined ? '—' : `${number(summary.wip.value, 0)} pç` }}</div><div class="metric-detail">Meta local dos buffers ativos</div></div><DataOriginBadge origin="INPUT" compact/></article>
      <article class="card metric-card"><div class="metric-icon"><TrendingUp :size="22"/></div><div><div class="metric-label">Produção × demanda</div><div class="metric-value">{{ number(summary.production.value, 0) }} / {{ number(summary.demand.value, 0) }}</div><div class="metric-detail">{{ summary.production.value === undefined ? `${summary.quality.productionCoverage.missing} medida(s) observada(s) pendente(s)` : 'Todas as medidas do recorte disponíveis' }}</div></div><DataOriginBadge origin="ORACLE_MES" compact/></article>
      <article class="card metric-card"><div class="metric-icon" :class="{ warning: summary.overdueActions }"><AlertTriangle :size="22"/></div><div><div class="metric-label">Atrasos</div><div class="metric-value">{{ summary.overdueActions }}</div><div class="metric-detail">Ações com prazo vencido</div></div><RouterLink to="/actions">Abrir plano</RouterLink></article>
      <article class="card metric-card"><div class="metric-icon" :class="{ success: sync.connected, warning: !sync.connected }"><Database :size="22"/></div><div><div class="metric-label">MES</div><div class="metric-value text-value">{{ sync.connected ? 'Conectado' : 'Offline' }}</div><div class="metric-detail">{{ summary.connection.lastUpdatedAt ? new Date(summary.connection.lastUpdatedAt).toLocaleString('pt-BR') : 'Sem atualização nesta sessão' }}</div></div><RouterLink to="/integrations">Diagnóstico</RouterLink></article>
    </section>

    <section class="overview-insights">
      <article class="card focus-card"><header><div><p class="eyebrow">PAINEL DE PRONTIDÃO</p><h2>O que está confiável agora</h2></div><ShieldCheck :size="22"/></header><div class="readiness-grid"><div><strong>{{ summary.quality.completeClients }}/{{ summary.quality.totalClients }}</strong><span>rotas completas</span></div><div><strong>{{ summary.quality.configuredCapacity }}/{{ summary.quality.totalCapacity }}</strong><span>capacidades com referência</span></div><div><strong>{{ summary.quality.automaticCycles }}/{{ summary.quality.totalCycles }}</strong><span>CT em modo automático</span></div><div><strong>{{ summary.quality.productionCoverage.present }}/{{ summary.quality.productionCoverage.expected }}</strong><span>medidas de produção</span></div></div><p class="insight-note">Os números ficam separados por origem: parâmetros locais, medidas calculadas e leitura Oracle/MES. Quando faltar uma entrada, o resultado aparece como pendente.</p></article>
      <article class="card confidence-card"><header><div><p class="eyebrow">QUALIDADE DO DADO</p><h2>Antes de decidir</h2></div><GitBranch :size="22"/></header><div class="confidence-list"><div><CheckCircle2 v-if="forms.capacityRows.length" :size="16"/><AlertTriangle v-else :size="16"/><span>Cadastro de máquinas</span><b>{{ forms.capacityRows.filter((row) => row.status === 'active').length }} ativos</b></div><div><CheckCircle2 v-if="summary.quality.demandCoverage.present === summary.quality.demandCoverage.expected" :size="16"/><AlertTriangle v-else :size="16"/><span>Demanda do recorte</span><b>{{ summary.quality.demandCoverage.present }}/{{ summary.quality.demandCoverage.expected }}</b></div><div><CheckCircle2 v-if="sync.connected" :size="16"/><AlertTriangle v-else :size="16"/><span>Atualização operacional</span><b>{{ sync.connected ? 'Conectada' : 'Offline' }}</b></div></div><RouterLink class="button button-secondary confidence-link" to="/integrations">Ver origem e tabelas</RouterLink></article>
    </section>

    <section class="card client-summary"><header><div><h2>Lead Time por cliente</h2><p>Mesmo total funcional do Layout, sem subtotal adicional de ENN. Clique em um cliente no cockpit para abrir a hierarquia.</p></div><RouterLink class="button button-secondary" to="/mifc/layout">Abrir cockpit</RouterLink></header><div class="client-grid"><article v-for="total in totals" :key="total.clientKey" :class="{ pending: total.value === undefined, complete: total.value !== undefined }"><span>{{ clientLabels[total.clientKey] }}</span><strong>{{ days(total.value) }}</strong><small v-if="total.value === undefined"><AlertTriangle :size="12"/> {{ total.missingKeys.length }} entrada(s) pendente(s)</small><small v-else><CheckCircle2 :size="12"/> Rota calculada sem lacunas</small></article></div></section>
  </main>
</template>

<style scoped>
.overview-page{display:grid;gap:16px}.eyebrow{margin:0 0 5px;color:var(--brand-blue);font-size:9px;font-weight:800;letter-spacing:.08em}.context-banner{display:flex;align-items:center;justify-content:space-between;gap:12px}.context-banner>span{display:grid;gap:3px}.context-banner small{color:var(--text-secondary)}.context-banner.warning{border-color:#efd39b;background:#fff9ed}.context-banner button{display:grid;width:34px;height:34px;place-items:center;border:0;border-radius:50%;background:transparent}.executive-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.metric-card{position:relative;grid-template-columns:42px minmax(0,1fr);align-items:center;min-height:94px}.metric-card>.origin-badge,.metric-card>a{position:absolute;right:10px;bottom:8px}.metric-card>a{color:var(--brand-blue);font-size:9px;font-weight:700}.metric-icon.success{background:var(--success-soft);color:var(--success)}.metric-icon.warning{background:var(--warning-soft);color:var(--warning)}.metric-icon.lavender{background:#f1efff;color:#6b5ce7}.text-value{font-size:18px}.overview-insights{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}.focus-card,.confidence-card{display:grid;gap:15px}.focus-card header,.confidence-card header{display:flex;align-items:flex-start;justify-content:space-between}.focus-card h2,.confidence-card h2{margin:0;font-size:15px}.focus-card header>svg,.confidence-card header>svg{color:var(--brand-blue)}.readiness-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.readiness-grid div{display:grid;gap:3px;padding:12px;border-radius:9px;background:#f6f8fb}.readiness-grid strong{font-size:18px;color:var(--text-primary)}.readiness-grid span{color:var(--text-secondary);font-size:9px;line-height:1.25}.insight-note{margin:0;color:var(--text-secondary);font-size:10px;line-height:1.45}.confidence-list{display:grid;gap:10px}.confidence-list div{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:7px;padding-bottom:9px;border-bottom:1px solid var(--border-subtle);font-size:10px}.confidence-list div:last-child{border-bottom:0}.confidence-list svg{color:var(--success)}.confidence-list div:has(svg:last-child){color:var(--text-secondary)}.confidence-list b{font-size:10px}.confidence-link{justify-self:start}.client-summary>header{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid var(--border-subtle)}.client-summary h2,.client-summary p{margin:0}.client-summary p{margin-top:4px;color:var(--text-secondary);font-size:10px}.client-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.client-grid article{display:grid;gap:4px;padding:18px;border-right:1px solid var(--border-subtle)}.client-grid article:last-child{border-right:0}.client-grid span,.client-grid small{display:flex;align-items:center;gap:5px;color:var(--text-secondary);font-size:10px}.client-grid strong{font-size:19px}.client-grid .pending strong{color:var(--text-tertiary)}.client-grid .complete small{color:var(--success)}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1180px){.executive-metrics{grid-template-columns:repeat(2,1fr)}.overview-insights{grid-template-columns:1fr}}@media(max-width:700px){.executive-metrics,.client-grid{grid-template-columns:1fr}.readiness-grid{grid-template-columns:repeat(2,1fr)}.client-grid article{border-right:0;border-bottom:1px solid var(--border-subtle)}}
</style>
