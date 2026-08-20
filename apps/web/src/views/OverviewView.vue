<script setup lang="ts">
import { Activity, AlertTriangle, Boxes, Clock3, Database, Gauge, RefreshCw, Save, TimerOff, TrendingUp } from "@lucide/vue";
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
  capacityCandidates: forms.capacityRows.map((row) => ({ label: row.process, capacityPerDay: row.referenceCapacityPerDay, demandPerDay: measures.value.values?.[capacityDemandKeys[row.id]] })),
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
      <article class="card metric-card"><div class="metric-icon"><Clock3 :size="22"/></div><div><div class="metric-label">Lead Time</div><div class="metric-value">{{ days(summary.leadTime.value) }}</div><div class="metric-detail">{{ summary.leadTime.clientKey ? clientLabels[summary.leadTime.clientKey] : missing(summary.leadTime.value) }}</div></div><DataOriginBadge origin="CALCULATED" compact/></article>
      <article class="card metric-card"><div class="metric-icon success"><Activity :size="22"/></div><div><div class="metric-label">VA</div><div class="metric-value">{{ days(summary.valueAdded.value) }}</div><div class="metric-detail">Tempo das máquinas da mesma rota</div></div><DataOriginBadge origin="CALCULATED" compact/></article>
      <article class="card metric-card"><div class="metric-icon warning"><TimerOff :size="22"/></div><div><div class="metric-label">NVA</div><div class="metric-value">{{ days(summary.nonValueAdded.value) }}</div><div class="metric-detail">Lead Time − VA; sem completar lacunas</div></div><DataOriginBadge origin="CALCULATED" compact/></article>
      <article class="card metric-card"><div class="metric-icon warning"><Gauge :size="22"/></div><div><div class="metric-label">Gargalo</div><div class="metric-value text-value">{{ summary.bottleneck.label ?? '—' }}</div><div class="metric-detail">{{ summary.bottleneck.utilizationPercent === undefined ? 'Aguardando demanda e capacidade' : `${number(summary.bottleneck.utilizationPercent, 1)}% de utilização planejada` }}</div></div><DataOriginBadge origin="MIXED" compact/></article>
      <article class="card metric-card"><div class="metric-icon lavender"><Boxes :size="22"/></div><div><div class="metric-label">WIP</div><div class="metric-value">{{ summary.wip.value === undefined ? '—' : `${number(summary.wip.value, 0)} pç` }}</div><div class="metric-detail">{{ missing(summary.wip.value) }}</div></div><DataOriginBadge origin="INPUT" compact/></article>
      <article class="card metric-card"><div class="metric-icon"><TrendingUp :size="22"/></div><div><div class="metric-label">Produção × demanda</div><div class="metric-value">{{ number(summary.production.value, 0) }} / {{ number(summary.demand.value, 0) }}</div><div class="metric-detail">{{ summary.production.value === undefined ? 'Aguardando dados observados' : 'Peças no contexto selecionado' }}</div></div><DataOriginBadge origin="ORACLE_MES" compact/></article>
      <article class="card metric-card"><div class="metric-icon" :class="{ warning: summary.overdueActions }"><AlertTriangle :size="22"/></div><div><div class="metric-label">Atrasos</div><div class="metric-value">{{ summary.overdueActions }}</div><div class="metric-detail">Ações com prazo vencido</div></div><RouterLink to="/actions">Abrir plano</RouterLink></article>
      <article class="card metric-card"><div class="metric-icon" :class="{ success: sync.connected, warning: !sync.connected }"><Database :size="22"/></div><div><div class="metric-label">MES</div><div class="metric-value text-value">{{ sync.connected ? 'Conectado' : 'Offline' }}</div><div class="metric-detail">{{ summary.connection.lastUpdatedAt ? new Date(summary.connection.lastUpdatedAt).toLocaleString('pt-BR') : 'Sem atualização nesta sessão' }}</div></div><RouterLink to="/integrations">Diagnóstico</RouterLink></article>
    </section>

    <section class="card client-summary"><header><div><h2>Lead Time por cliente</h2><p>Mesmo total funcional do Layout, sem subtotal adicional de ENN.</p></div><RouterLink class="button button-secondary" to="/mifc/layout">Abrir cockpit</RouterLink></header><div class="client-grid"><article v-for="total in totals" :key="total.clientKey" :class="{ pending: total.value === undefined }"><span>{{ clientLabels[total.clientKey] }}</span><strong>{{ days(total.value) }}</strong><small>{{ total.value === undefined ? `${total.missingKeys.length} entrada(s) pendente(s)` : total.measureKey }}</small></article></div></section>
  </main>
</template>

<style scoped>
.overview-page{display:grid;gap:16px}.eyebrow{margin:0 0 5px;color:var(--brand-blue);font-size:9px;font-weight:800;letter-spacing:.08em}.context-banner{display:flex;align-items:center;justify-content:space-between;gap:12px}.context-banner>span{display:grid;gap:3px}.context-banner small{color:var(--text-secondary)}.context-banner.warning{border-color:#efd39b;background:#fff9ed}.context-banner button{display:grid;width:34px;height:34px;place-items:center;border:0;border-radius:50%;background:transparent}.executive-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.metric-card{position:relative;grid-template-columns:42px minmax(0,1fr);align-items:center}.metric-card>.origin-badge,.metric-card>a{position:absolute;right:10px;bottom:8px}.metric-card>a{color:var(--brand-blue);font-size:9px;font-weight:700}.metric-icon.success{background:var(--success-soft);color:var(--success)}.metric-icon.warning{background:var(--warning-soft);color:var(--warning)}.metric-icon.lavender{background:#f1efff;color:#6b5ce7}.text-value{font-size:18px}.client-summary>header{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid var(--border-subtle)}.client-summary h2,.client-summary p{margin:0}.client-summary p{margin-top:4px;color:var(--text-secondary);font-size:10px}.client-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.client-grid article{display:grid;gap:4px;padding:18px;border-right:1px solid var(--border-subtle)}.client-grid article:last-child{border-right:0}.client-grid span,.client-grid small{color:var(--text-secondary);font-size:10px}.client-grid strong{font-size:19px}.client-grid .pending strong{color:var(--text-tertiary)}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1180px){.executive-metrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.executive-metrics,.client-grid{grid-template-columns:1fr}.client-grid article{border-right:0;border-bottom:1px solid var(--border-subtle)}}
</style>
