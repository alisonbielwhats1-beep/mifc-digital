<script setup lang="ts">
import { Activity, AlertTriangle, Factory, Gauge, Plus, Search } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";
import FormSaveBar from "@/components/FormSaveBar.vue";
import FormSourcePanel from "@/components/FormSourcePanel.vue";
import TableRowActions from "@/components/TableRowActions.vue";
import { useMifcFormsStore } from "@/stores/mifc-forms";
import { useUiStore } from "@/stores/ui";

const forms = useMifcFormsStore();
const ui = useUiStore();
forms.hydrate();
const { capacityRows, isDirty, savedAt } = storeToRefs(forms);
const { saveStatus } = storeToRefs(ui);
const search = ref("");

const activeRows = computed(() => capacityRows.value.filter((row) => row.status === "active"));
const visibleRows = computed(() => {
  const term = search.value.trim().toLocaleLowerCase("pt-BR");
  return [...capacityRows.value]
    .filter((row) => !term || row.process.toLocaleLowerCase("pt-BR").includes(term) || row.processCode.toLocaleLowerCase("pt-BR").includes(term))
    .sort((a, b) => a.sequence - b.sequence);
});
const referenceCapacity = computed(() => activeRows.value.reduce((sum, row) => sum + Number(row.referenceCapacityPerDay || 0), 0));
const averageEfficiency = computed(() => activeRows.value.length ? activeRows.value.reduce((sum, row) => sum + Number(row.efficiencyPercent || 0), 0) / activeRows.value.length : 0);
const totalWip = computed(() => activeRows.value.reduce((sum, row) => sum + Number(row.targetWipPieces || 0), 0));

async function save() {
  const invalid = capacityRows.value.some((row) => !row.processCode.trim() || !row.process.trim() || !row.speedUnit.trim() || row.sequence < 1 || row.cycleTimeSeconds < 0 || row.nominalCapacityPerHour < 0 || row.shifts < 1 || row.availableHoursPerDay < 0 || row.availableHoursPerDay > 24 || row.efficiencyPercent < 0 || row.efficiencyPercent > 100 || row.targetWipPieces < 0);
  if (invalid) { ui.showError("Revise código, processo, unidade e parâmetros de capacidade antes de salvar."); return; }
  try { forms.save(); await ui.saveDemoRevision({ module: "capacity", schemaVersion: 1, savedAt: forms.savedAt }); }
  catch { ui.showError("Não foi possível salvar a revisão no armazenamento local."); }
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><h1>Capacidade</h1><p>Processos, velocidade nominal, disponibilidade, eficiência e WIP-meta.</p></div>
      <div class="page-actions"><button class="button button-secondary" type="button" @click="forms.addCapacity"><Plus :size="17" />Adicionar processo</button><FormSaveBar :dirty="isDirty" :saving="saveStatus === 'saving'" :saved-at="savedAt" @save="save" /></div>
    </div>

    <div class="context-banner"><span><strong>Sem fórmula presumida.</strong> Capacidade/dia mantém a referência importada identificada e bloqueada enquanto a regra específica e a unidade de cada processo não estiverem validadas no Power BI/documentação.</span><DataOriginBadge origin="IMPORT" /></div>

    <section class="metric-grid">
      <article class="card metric-card"><div class="metric-icon"><Factory :size="23" /></div><div><div class="metric-label">Processos ativos</div><div class="metric-value">{{ activeRows.length }}</div><div class="metric-detail">Cadastro da revisão</div></div></article>
      <article class="card metric-card"><div class="metric-icon lavender"><Gauge :size="23" /></div><div><div class="metric-label">Capacidade de referência</div><div class="metric-value">{{ referenceCapacity.toLocaleString('pt-BR') }}</div><div class="metric-detail">Importada, não recalculada</div></div></article>
      <article class="card metric-card"><div class="metric-icon danger"><AlertTriangle :size="23" /></div><div><div class="metric-label">Gargalo</div><div class="metric-value pending-metric">A validar</div><div class="metric-detail">Calculation Engine — Prompt 4</div></div></article>
      <article class="card metric-card"><div class="metric-icon success"><Activity :size="23" /></div><div><div class="metric-label">Eficiência-meta média</div><div class="metric-value">{{ averageEfficiency.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}%</div><div class="metric-detail">{{ totalWip.toLocaleString('pt-BR') }} peças de WIP-meta</div></div></article>
    </section>

    <section class="form-layout">
      <article class="card table-shell">
        <header class="card-header table-tools">
          <div><h2>Parâmetros dos processos</h2><p class="section-description">A ordem é controlada pela sequência; campos planejados continuam editáveis.</p></div>
          <label class="table-search"><Search :size="16" /><span class="sr-only">Buscar processo</span><input v-model="search" type="search" placeholder="Buscar processo..." /></label>
        </header>
        <div class="table-scroll">
          <table class="data-table capacity-table">
            <thead><tr class="column-band"><th colspan="3"></th><th colspan="7">Valor manual / importado (editável)</th><th class="calculated-band">Referência importada</th><th colspan="3"></th></tr><tr><th>Seq.</th><th>Código</th><th>Processo</th><th>Tempo de Ciclo — CT (s/peça)</th><th>Capacidade nominal (por hora)</th><th>Unidade</th><th>Turnos</th><th>Tempo disponível (h/dia)</th><th>Eficiência / OEE-meta (%)</th><th>WIP-meta (peças)</th><th>Capacidade de referência (peças/dia)</th><th>Origem</th><th>Status</th><th><span class="sr-only">Ações</span></th></tr></thead>
            <tbody>
              <tr v-for="row in visibleRows" :key="row.id" :class="{ 'inactive-row': row.status === 'inactive' }">
                <td><input v-model.number="row.sequence" class="table-input number-input sequence-input" type="number" min="1" step="1" aria-label="Sequência" /></td><td><input v-model.trim="row.processCode" class="table-input code-input" required aria-label="Código do processo" /></td><td><input v-model.trim="row.process" class="table-input process-input" required aria-label="Processo" /></td>
                <td><input v-model.number.lazy="row.cycleTimeSeconds" :data-model-value="row.cycleTimeSeconds" class="table-input number-input" type="number" min="0" step="0.1" aria-label="Tempo de Ciclo — CT (s/peça)" /></td><td><input v-model.number="row.nominalCapacityPerHour" class="table-input number-input" type="number" min="0" step="0.1" aria-label="Capacidade nominal por hora" /></td><td><input v-model.trim="row.speedUnit" class="table-input unit-input" required aria-label="Unidade de velocidade" /></td><td><input v-model.number="row.shifts" class="table-input number-input" type="number" min="1" max="4" step="1" aria-label="Turnos" /></td><td><input v-model.number="row.availableHoursPerDay" class="table-input number-input" type="number" min="0" max="24" step="0.1" aria-label="Horas disponíveis por dia" /></td><td><input v-model.number="row.efficiencyPercent" class="table-input number-input" type="number" min="0" max="100" step="0.1" aria-label="Eficiência percentual" /></td><td><input v-model.number="row.targetWipPieces" class="table-input number-input" type="number" min="0" step="1" aria-label="WIP-meta" /></td>
                <td><span v-if="row.referenceCapacityPerDay !== null" class="readonly-value">{{ row.referenceCapacityPerDay.toLocaleString('pt-BR') }}</span><span v-else class="readonly-value pending">Pendente</span></td><td><DataOriginBadge origin="IMPORT" compact /></td><td><select v-model="row.status" class="table-select table-status-select" :class="{ inactive: row.status === 'inactive' }"><option value="active">Ativo</option><option value="inactive">Inativo</option></select></td><td><TableRowActions :active="row.status === 'active'" :label="row.process" @duplicate="forms.duplicateCapacity(row.id)" @toggle="forms.toggleStatus(row)" /></td>
              </tr>
              <tr v-if="visibleRows.length === 0"><td colspan="14"><div class="empty-row">Nenhum processo corresponde à busca.</div></td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <FormSourcePanel><strong class="source-title"><Gauge :size="15" />Classificação aplicada</strong><p>Tempo de Ciclo, capacidade nominal, turnos, disponibilidade, unidade, OEE-meta e WIP-meta são parâmetros. Produção, paradas, golpes e WIP realizado são observados no MES quando o cache autorizado está disponível. Capacidade/dia, utilização e gargalo permanecem pendentes onde a regra específica ainda não foi comprovada.</p></FormSourcePanel>
    </section>
  </div>
</template>

<style scoped>
.metric-icon.lavender { background: #f1efff; color: #6b5ce7; }
.metric-icon.danger { background: var(--danger-soft); color: var(--danger); }
.metric-icon.success { background: var(--success-soft); color: var(--success); }
.pending-metric { color: var(--warning); font-size: 1.2rem; }
.capacity-table { min-width: 1710px; }
.table-tools { flex-wrap: wrap; }
.table-search { display: flex; min-height: 38px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-tertiary); }
.table-search input { width: 180px; border: 0; outline: 0; background: transparent; font-size: .78rem; }
.sequence-input { min-width: 58px; }.code-input { min-width: 86px; }.process-input { min-width: 160px; }.unit-input { min-width: 90px; }
.source-title { display: inline-flex; align-items: center; gap: 6px; }
.empty-row { padding: 28px; color: var(--text-secondary); text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
@media (max-width: 720px) { .page-actions { align-items: stretch; flex-direction: column; } }
</style>
