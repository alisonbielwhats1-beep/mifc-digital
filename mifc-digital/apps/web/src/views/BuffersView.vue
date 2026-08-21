<script setup lang="ts">
import { calculateWipDays } from "@mifc/calculation-engine";
import { Boxes, CircleGauge, Database, Layers3, Plus } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";
import FormSaveBar from "@/components/FormSaveBar.vue";
import FormSourcePanel from "@/components/FormSourcePanel.vue";
import TableRowActions from "@/components/TableRowActions.vue";
import { useMifcFormsStore, type BufferFormRow } from "@/stores/mifc-forms";
import { useUiStore } from "@/stores/ui";

const forms = useMifcFormsStore();
const ui = useUiStore();
forms.hydrate();
const { bufferRows, isDirty, savedAt } = storeToRefs(forms);
const { saveStatus } = storeToRefs(ui);
const activeRows = computed(() => bufferRows.value.filter((row) => row.status === "active"));
const totalWip = computed(() => activeRows.value.reduce((sum, row) => sum + Number(row.quantityPieces || 0), 0));
const totalCapacity = computed(() => activeRows.value.reduce((sum, row) => sum + Number(row.capacityPieces || 0), 0));
const averageStockDays = computed(() => activeRows.value.length ? activeRows.value.reduce((sum, row) => sum + days(row), 0) / activeRows.value.length : 0);
const mesRows = computed(() => activeRows.value.filter((row) => row.origin === "ORACLE_MES").length);

function days(row: BufferFormRow): number { return calculateWipDays(Number(row.quantityPieces), Number(row.pairsPerDay)); }
async function save() {
  const invalid = bufferRows.value.some((row) => !row.customer.trim() || !row.point.trim() || row.quantityPieces < 0 || row.capacityPieces < 0 || row.pairsPerDay < 0);
  if (invalid) { ui.showError("Revise cliente, ponto, WIP, capacidade e pares/dia antes de salvar."); return; }
  try { forms.save(); await ui.saveDemoRevision({ module: "buffers", schemaVersion: 1, savedAt: forms.savedAt }); }
  catch { ui.showError("Não foi possível salvar a revisão no armazenamento local."); }
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><h1>Buffer e Estoque</h1><p>Pontos de WIP, limites, dias e conexões do fluxo.</p></div>
      <div class="page-actions"><button class="button button-secondary" type="button" @click="forms.addBuffer"><Plus :size="17" />Adicionar ponto</button><FormSaveBar :dirty="isDirty" :saving="saveStatus === 'saving'" :saved-at="savedAt" @save="save" /></div>
    </div>
    <div class="context-banner"><span><strong>Grade WIP preservada.</strong> Pontos sem cobertura MES continuam editáveis; dados online serão bloqueados e identificados pela fonte.</span><DataOriginBadge origin="MIXED" /></div>

    <section class="metric-grid">
      <article class="card metric-card"><div class="metric-icon"><Boxes :size="23" /></div><div><div class="metric-label">WIP total</div><div class="metric-value">{{ totalWip.toLocaleString('pt-BR') }} pç</div><div class="metric-detail">Pontos ativos</div></div></article>
      <article class="card metric-card"><div class="metric-icon lavender"><Layers3 :size="23" /></div><div><div class="metric-label">Capacidade de buffers</div><div class="metric-value">{{ totalCapacity.toLocaleString('pt-BR') }} pç</div><div class="metric-detail">Limites cadastrados</div></div></article>
      <article class="card metric-card"><div class="metric-icon orange"><CircleGauge :size="23" /></div><div><div class="metric-label">Estoque médio</div><div class="metric-value">{{ averageStockDays.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }} dias</div><div class="metric-detail">Fórmula validada</div></div></article>
      <article class="card metric-card"><div class="metric-icon green"><Database :size="23" /></div><div><div class="metric-label">Pontos online</div><div class="metric-value">{{ mesRows }}</div><div class="metric-detail">Oracle/MES</div></div></article>
    </section>

    <section class="form-layout">
      <article class="card table-shell">
        <header class="card-header"><div><h2>Pontos de estoque e WIP</h2><p class="section-description">Cobertura da aba WIP: cliente, entrada/saída e pontos do fluxo.</p></div><DataOriginBadge origin="MIXED" /></header>
        <div class="table-scroll">
          <table class="data-table buffer-table">
            <thead><tr class="column-band"><th colspan="4"></th><th colspan="5">Input / MES</th><th>Calculado</th><th colspan="3"></th></tr><tr><th>Cliente</th><th>Ponto / localização</th><th>Direção</th><th>Tipo</th><th>WIP (peças)</th><th>Limite / capacidade</th><th>Pares/dia</th><th>Processo entrada</th><th>Processo saída</th><th>Dias estoque</th><th>Origem</th><th>Status</th><th><span class="sr-only">Ações</span></th></tr></thead>
            <tbody>
              <tr v-for="row in bufferRows" :key="row.id" :class="{ 'inactive-row': row.status === 'inactive', over: row.capacityPieces > 0 && row.quantityPieces > row.capacityPieces }">
                <td><input v-model.trim="row.customer" class="table-input text-wide" required aria-label="Cliente" /></td><td><input v-model.trim="row.point" class="table-input point-wide" required aria-label="Ponto ou localização" /></td><td><select v-model="row.direction" class="table-select" aria-label="Direção"><option value="entrada">Entrada</option><option value="saída">Saída</option></select></td><td><select v-model="row.type" class="table-select" aria-label="Tipo de buffer"><option value="matéria-prima">Matéria-prima</option><option value="processo">Processo</option><option value="produto acabado">Produto acabado</option><option value="estagnação">Estagnação</option></select></td>
                <td><input v-model.number="row.quantityPieces" class="table-input number-input" type="number" min="0" step="1" :disabled="row.origin === 'ORACLE_MES'" aria-label="WIP em peças" /></td><td><input v-model.number="row.capacityPieces" class="table-input number-input" type="number" min="0" step="1" aria-label="Capacidade do buffer" /></td><td><input v-model.number="row.pairsPerDay" class="table-input number-input" type="number" min="0" step="0.1" aria-label="Pares por dia" /></td><td><input v-model.trim="row.inputProcess" class="table-input" aria-label="Processo de entrada" /></td><td><input v-model.trim="row.outputProcess" class="table-input" aria-label="Processo de saída" /></td>
                <td><span class="readonly-value">{{ days(row).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) }}</span></td><td><DataOriginBadge :origin="row.origin" compact /></td><td><select v-model="row.status" class="table-select table-status-select" :class="{ inactive: row.status === 'inactive' }"><option value="active">Ativo</option><option value="inactive">Inativo</option></select></td><td><TableRowActions :active="row.status === 'active'" :label="row.point" @duplicate="forms.duplicateBuffer(row.id)" @toggle="forms.toggleStatus(row)" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <FormSourcePanel><strong class="source-title"><Layers3 :size="15" />Pontos mapeados</strong><p>LCT, RF2, RF3, mesas, Beattys, gravação, plasma, CNC, pintura, Stenhoj e embalagens podem ser cadastrados. Dias = WIP em peças ÷ 2 ÷ pares/dia, conforme o MIFC-2023.</p></FormSourcePanel>
    </section>
  </div>
</template>

<style scoped>
.metric-icon.lavender { background: #f1efff; color: #6b5ce7; }
.metric-icon.orange { background: var(--warning-soft); color: var(--warning); }
.metric-icon.green { background: var(--success-soft); color: var(--success); }
.buffer-table { min-width: 1640px; }
.text-wide { min-width: 120px; }.point-wide { min-width: 160px; }
.over { background: var(--danger-soft); }
.source-title { display: inline-flex; align-items: center; gap: 6px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
@media (max-width: 720px) { .page-actions { align-items: stretch; flex-direction: column; } }
</style>
