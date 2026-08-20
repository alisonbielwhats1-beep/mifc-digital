<script setup lang="ts">
import { CalendarClock, ClockArrowUp, Plus, Route, Truck, Warehouse } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";
import FormSaveBar from "@/components/FormSaveBar.vue";
import FormSourcePanel from "@/components/FormSourcePanel.vue";
import TableRowActions from "@/components/TableRowActions.vue";
import { useMifcFormsStore } from "@/stores/mifc-forms";
import { useUiStore } from "@/stores/ui";

const forms = useMifcFormsStore();
const ui = useUiStore();
forms.hydrate();
const { logisticsRows, isDirty, savedAt } = storeToRefs(forms);
const { saveStatus } = storeToRefs(ui);

const activeRows = computed(() => logisticsRows.value.filter((row) => row.status === "active"));
const scheduledRows = computed(() => activeRows.value.filter((row) => row.plannedDate).length);
const averageTransport = computed(() => activeRows.value.length ? activeRows.value.reduce((sum, row) => sum + Number(row.transportHours || 0), 0) / activeRows.value.length : 0);
const totalLots = computed(() => activeRows.value.reduce((sum, row) => sum + Number(row.shipmentLotSize || 0), 0));

async function save() {
  const invalid = logisticsRows.value.some((row) => !row.customer.trim() || !row.plannedDate || !row.plannedTime || row.transportHours < 0 || row.beneficiatorDays < 0 || row.movementMinutes < 0 || row.shipmentLotSize < 0);
  if (invalid) { ui.showError("Preencha cliente, data, horário e revise os parâmetros logísticos."); return; }
  try { forms.save(); await ui.saveDemoRevision({ module: "logistics", schemaVersion: 1, savedAt: forms.savedAt }); }
  catch { ui.showError("Não foi possível salvar a revisão no armazenamento local."); }
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><h1>Logística</h1><p>Programação, transporte e dados de embarque por revisão.</p></div>
      <div class="page-actions"><button class="button button-secondary" type="button" @click="forms.addLogistics"><Plus :size="17" />Adicionar programação</button><FormSaveBar :dirty="isDirty" :saving="saveStatus === 'saving'" :saved-at="savedAt" @save="save" /></div>
    </div>

    <div class="context-banner"><span><strong>Oracle protegido.</strong> Datas planejadas, horários e parâmetros logísticos são editáveis. Colunas MES permanecem somente leitura.</span><DataOriginBadge origin="MIXED" /></div>

    <section class="metric-grid">
      <article class="card metric-card"><div class="metric-icon"><CalendarClock :size="23" /></div><div><div class="metric-label">Programações ativas</div><div class="metric-value">{{ scheduledRows }}</div><div class="metric-detail">Com data planejada</div></div></article>
      <article class="card metric-card"><div class="metric-icon blue"><Truck :size="23" /></div><div><div class="metric-label">Clientes / rotas</div><div class="metric-value">{{ activeRows.length }}</div><div class="metric-detail">Linhas da revisão</div></div></article>
      <article class="card metric-card"><div class="metric-icon orange"><ClockArrowUp :size="23" /></div><div><div class="metric-label">Transporte médio</div><div class="metric-value">{{ averageTransport.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} h</div><div class="metric-detail">Parâmetro planejado</div></div></article>
      <article class="card metric-card"><div class="metric-icon green"><Warehouse :size="23" /></div><div><div class="metric-label">Lote programado</div><div class="metric-value">{{ totalLots.toLocaleString('pt-BR') }}</div><div class="metric-detail">Peças por embarque</div></div></article>
    </section>

    <section class="form-layout">
      <div class="form-stack">
        <article class="card table-shell">
          <header class="card-header"><div><h2>Programação e transporte</h2><p class="section-description">Campos planejados da aplicação, com ligação futura aos dados de embarque.</p></div><DataOriginBadge origin="INPUT" /></header>
          <div class="table-scroll">
            <table class="data-table logistics-table">
              <thead><tr class="column-band"><th colspan="3"></th><th colspan="8">Input (editável)</th><th colspan="2"></th></tr><tr><th>Cliente</th><th>Veículo</th><th>Flatbed</th><th>Data programada</th><th>Horário</th><th>Transporte (h)</th><th>Beneficiador (dias)</th><th>Movimentação (min)</th><th>Frequência</th><th>Lote</th><th>Status</th><th>Origem</th><th><span class="sr-only">Ações</span></th></tr></thead>
              <tbody>
                <tr v-for="row in logisticsRows" :key="row.id" :class="{ 'inactive-row': row.status === 'inactive' }">
                  <td><input v-model.trim="row.customer" class="table-input text-wide" required aria-label="Cliente" /></td><td><input v-model.trim="row.vehicle" class="table-input" aria-label="Veículo" /></td><td><input v-model.trim="row.flatbed" class="table-input" aria-label="Flatbed" placeholder="Opcional" /></td>
                  <td><input v-model="row.plannedDate" class="table-input" type="date" aria-label="Data programada" /></td><td><input v-model="row.plannedTime" class="table-input" type="time" aria-label="Horário programado" /></td><td><input v-model.number="row.transportHours" class="table-input number-input" type="number" min="0" step="0.25" aria-label="Horas de transporte" /></td><td><input v-model.number="row.beneficiatorDays" class="table-input number-input" type="number" min="0" step="0.1" aria-label="Dias no beneficiador" /></td><td><input v-model.number="row.movementMinutes" class="table-input number-input" type="number" min="0" step="1" aria-label="Minutos de movimentação" /></td><td><input v-model.trim="row.shipmentFrequency" class="table-input" aria-label="Frequência de embarque" /></td><td><input v-model.number="row.shipmentLotSize" class="table-input number-input" type="number" min="0" step="1" aria-label="Tamanho do lote" /></td>
                  <td><select v-model="row.status" class="table-select table-status-select" :class="{ inactive: row.status === 'inactive' }"><option value="active">Ativo</option><option value="inactive">Inativo</option></select></td><td><DataOriginBadge origin="INPUT" compact /></td><td><TableRowActions :active="row.status === 'active'" :label="row.customer" @duplicate="forms.duplicateLogistics(row.id)" @toggle="forms.toggleStatus(row)" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="card table-shell">
          <header class="card-header"><div><h2>Dados operacionais de embarque</h2><p class="section-description">Espelho somente leitura das colunas já utilizadas pelo Power BI.</p></div><DataOriginBadge origin="ORACLE_MES" /></header>
          <div class="table-scroll">
            <table class="data-table mes-table">
              <thead><tr><th>Cliente</th><th>Ship date</th><th>Material / MP</th><th>Item / componente</th><th>Localização</th><th>Qtd. pedida</th><th>Qtd. finalizada</th><th>Fonte</th></tr></thead>
              <tbody>
                <tr v-for="row in logisticsRows" :key="`mes-${row.id}`" :class="{ 'inactive-row': row.status === 'inactive' }">
                  <td><strong>{{ row.customer }}</strong></td><td><span class="readonly-value pending">{{ row.shipDate || 'Aguardando MES' }}</span></td><td><span class="readonly-value pending">{{ row.material }}</span></td><td><span class="readonly-value pending">{{ row.item }}</span></td><td><span class="readonly-value pending">{{ row.location }}</span></td><td><span class="readonly-value pending">{{ row.orderedQuantity ?? '—' }}</span></td><td><span class="readonly-value pending">{{ row.finishedQuantity ?? '—' }}</span></td><td><DataOriginBadge :origin="row.mesOrigin" compact /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <FormSourcePanel><strong class="source-title"><Route :size="15" />Cobertura do MIPS</strong><p>Transporte, dias no Beneficiador, movimentação, programação, horário, flatbed, frequência e lote são manuais. Material, item, localização, ship date e quantidades vêm do Oracle/MES somente leitura quando disponíveis.</p></FormSourcePanel>
    </section>
  </div>
</template>

<style scoped>
.metric-icon.orange { background: var(--warning-soft); color: var(--warning); }
.metric-icon.green { background: var(--success-soft); color: var(--success); }
.logistics-table { min-width: 1580px; }
.mes-table { min-width: 1080px; }
.text-wide { min-width: 130px; }
.source-title { display: inline-flex; align-items: center; gap: 6px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
@media (max-width: 720px) { .page-actions { align-items: stretch; flex-direction: column; } }
</style>
