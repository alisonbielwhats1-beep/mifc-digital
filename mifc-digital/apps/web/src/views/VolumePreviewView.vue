<script setup lang="ts">
import { calculateMaterialStock, calculatePairsPerDay, calculateShiftAvailableMinutes } from "@mifc/calculation-engine";
import { CalendarDays, ChartNoAxesColumnIncreasing, Clock3, Footprints, Plus, Truck, UsersRound } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";
import FormSaveBar from "@/components/FormSaveBar.vue";
import FormSourcePanel from "@/components/FormSourcePanel.vue";
import TableRowActions from "@/components/TableRowActions.vue";
import { useMifcFormsStore, type ShiftRow, type VolumeFormRow } from "@/stores/mifc-forms";
import { useUiStore } from "@/stores/ui";

const forms = useMifcFormsStore();
const ui = useUiStore();
forms.hydrate();

const { volumeRows, shiftRows, isDirty, savedAt } = storeToRefs(forms);
const { saveStatus } = storeToRefs(ui);
const activeRows = computed(() => volumeRows.value.filter((row) => row.status === "active"));
const activeCustomers = computed(() => activeRows.value.length);
const vehiclesPerDay = computed(() => activeRows.value.reduce((total, row) => total + Number(row.vehiclesPerDay || 0), 0));
const pairsPerDay = computed(() => activeRows.value.reduce((total, row) => total + calculatePairs(row), 0));
const annualPairs = computed(() => activeRows.value.reduce((total, row) => total + calculatePairs(row) * Number(row.workingDays || 0), 0));
const availableHours = computed(() => shiftRows.value.filter((row) => row.status === "active").reduce((total, row) => total + shiftMinutes(row) / 60, 0));

function calculatePairs(row: VolumeFormRow): number {
  return calculatePairsPerDay(Number(row.vehiclesPerDay), Number(row.reinforcementPercent));
}

function stock(row: VolumeFormRow) {
  return calculateMaterialStock({ averageLengthMm: Number(row.averageLengthMm), widthMm: Number(row.widthMm), thicknessMm: Number(row.thicknessMm), densityKgDm3: Number(row.densityKgDm3), coilCount: Number(row.coilCount), coilWeightKg: Number(row.coilWeightKg), pairsPerDay: calculatePairs(row) });
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function shiftMinutes(row: ShiftRow): number {
  return calculateShiftAvailableMinutes({ startMinutes: toMinutes(row.startTime), endMinutes: toMinutes(row.endTime), rolloverMinutes: Number(row.rolloverMinutes), mealMinutes: Number(row.mealMinutes), meetingMinutes: Number(row.meetingMinutes) });
}

async function save() {
  const invalidVolume = volumeRows.value.some((row) => !row.customer.trim() || !row.model.trim() || row.vehiclesPerDay < 0 || row.reinforcementPercent < 0 || row.workingDays < 0 || row.workingDays > 366 || row.shifts < 1);
  const invalidShift = shiftRows.value.some((row) => !row.label.trim() || !row.startTime || !row.endTime || row.rolloverMinutes < 0 || row.mealMinutes < 0 || row.meetingMinutes < 0);
  if (invalidVolume || invalidShift) { ui.showError("Revise os campos destacados de Volume e Turnos antes de salvar."); return; }
  try { forms.save(); await ui.saveDemoRevision({ module: "volume", schemaVersion: 1, savedAt: forms.savedAt }); }
  catch { ui.showError("Não foi possível salvar a revisão no armazenamento local."); }
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><h1>Volume</h1><p>Demanda, calendário, geometria e estoque Slitter da revisão.</p></div>
      <div class="page-actions">
        <button class="button button-secondary" type="button" @click="forms.addVolume"><Plus :size="17" />Adicionar cliente</button>
        <FormSaveBar :dirty="isDirty" :saving="saveStatus === 'saving'" :saved-at="savedAt" @save="save" />
      </div>
    </div>

    <div class="context-banner"><span><strong>Mapeado no MIPS 2026.</strong> As células amarelas viraram inputs; fórmulas confirmadas permanecem bloqueadas e rastreáveis.</span><DataOriginBadge origin="MIXED" /></div>

    <section class="metric-grid">
      <article class="card metric-card"><div class="metric-icon"><UsersRound :size="23" /></div><div><div class="metric-label">Clientes ativos</div><div class="metric-value">{{ activeCustomers }}</div><div class="metric-detail">Cadastro da revisão</div></div></article>
      <article class="card metric-card"><div class="metric-icon"><Truck :size="23" /></div><div><div class="metric-label">Veículos/dia</div><div class="metric-value">{{ vehiclesPerDay.toLocaleString('pt-BR') }}</div><div class="metric-detail">Input do cenário</div></div></article>
      <article class="card metric-card"><div class="metric-icon green"><Footprints :size="23" /></div><div><div class="metric-label">Pares/dia</div><div class="metric-value">{{ pairsPerDay.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}</div><div class="metric-detail">Fórmula validada</div></div></article>
      <article class="card metric-card"><div class="metric-icon lavender"><ChartNoAxesColumnIncreasing :size="23" /></div><div><div class="metric-label">Volume anual</div><div class="metric-value">{{ annualPairs.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}</div><div class="metric-detail">Pares planejados</div></div></article>
    </section>

    <section class="form-layout">
      <div class="form-stack">
        <article class="card table-shell">
          <header class="card-header"><div><h2>Clientes e demanda</h2><p class="section-description">Valores equivalentes a C8:F11 da aba Volume 2023.</p></div><DataOriginBadge origin="INPUT" /></header>
          <div class="table-scroll">
            <table class="data-table editable-table">
              <thead><tr class="column-band"><th colspan="2"></th><th colspan="5">Input (editável)</th><th>Calculado</th><th colspan="2"></th></tr><tr><th>Cliente</th><th>Veículo / Modelo</th><th>Veículos/dia</th><th>Reforço %</th><th>Dias trabalhados</th><th>Turnos</th><th>Status</th><th>Pares/dia</th><th>Origem</th><th><span class="sr-only">Ações</span></th></tr></thead>
              <tbody>
                <tr v-for="row in volumeRows" :key="row.id" :class="{ 'inactive-row': row.status === 'inactive' }">
                  <td><input v-model.trim="row.customer" class="table-input text-wide" required aria-label="Cliente" /></td><td><input v-model.trim="row.model" class="table-input" required aria-label="Veículo ou modelo" /></td>
                  <td><input v-model.number="row.vehiclesPerDay" class="table-input number-input" type="number" min="0" step="1" aria-label="Veículos por dia" /></td><td><input v-model.number="row.reinforcementPercent" class="table-input number-input" type="number" min="0" step="0.1" aria-label="Reforço percentual" /></td>
                  <td><input v-model.number="row.workingDays" class="table-input number-input" type="number" min="0" max="366" step="1" aria-label="Dias trabalhados" /></td><td><input v-model.number="row.shifts" class="table-input number-input" type="number" min="1" max="4" step="1" aria-label="Turnos" /></td>
                  <td><select v-model="row.status" class="table-select table-status-select" :class="{ inactive: row.status === 'inactive' }" aria-label="Status"><option value="active">Ativo</option><option value="inactive">Inativo</option></select></td>
                  <td><span class="readonly-value">{{ calculatePairs(row).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}</span></td><td><DataOriginBadge origin="CALCULATED" compact /></td>
                  <td><TableRowActions :active="row.status === 'active'" :label="row.customer" @duplicate="forms.duplicateVolume(row.id)" @toggle="forms.toggleStatus(row)" /></td>
                </tr>
              </tbody>
              <tfoot><tr><th colspan="2">Total ativo</th><th class="number">{{ vehiclesPerDay.toLocaleString('pt-BR') }}</th><th colspan="4"></th><th class="number">{{ pairsPerDay.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}</th><th colspan="2"></th></tr></tfoot>
            </table>
          </div>
        </article>

        <article class="card table-shell">
          <header class="card-header"><div><h2>Geometria e estoque Slitter</h2><p class="section-description">Parâmetros antes ocultos nas fórmulas agora são campos nomeados.</p></div><DataOriginBadge origin="MIXED" /></header>
          <div class="table-scroll">
            <table class="data-table editable-table material-table">
              <thead><tr class="column-band"><th></th><th colspan="6">Input (editável)</th><th colspan="5" class="calculated-band">Calculado</th></tr><tr><th>Cliente</th><th>Comp. médio (mm)</th><th>Largura (mm)</th><th>Espessura (mm)</th><th>Densidade</th><th>Bobinas</th><th>kg/bobina</th><th>kg/peça</th><th>Estoque kg</th><th>Peças</th><th>Pares</th><th>Dias estoque</th></tr></thead>
              <tbody>
                <tr v-for="row in volumeRows" :key="`material-${row.id}`" :class="{ 'inactive-row': row.status === 'inactive' }">
                  <td><strong>{{ row.customer }}</strong></td>
                  <td><input v-model.number="row.averageLengthMm" class="table-input number-input" type="number" min="0" step="1" aria-label="Comprimento médio em milímetros" /></td><td><input v-model.number="row.widthMm" class="table-input number-input" type="number" min="0" step="0.1" aria-label="Largura em milímetros" /></td><td><input v-model.number="row.thicknessMm" class="table-input number-input" type="number" min="0" step="0.1" aria-label="Espessura em milímetros" /></td><td><input v-model.number="row.densityKgDm3" class="table-input number-input" type="number" min="0" step="0.01" aria-label="Densidade" /></td><td><input v-model.number="row.coilCount" class="table-input number-input" type="number" min="0" step="1" aria-label="Quantidade de bobinas" /></td><td><input v-model.number="row.coilWeightKg" class="table-input number-input" type="number" min="0" step="1" aria-label="Peso por bobina" /></td>
                  <td><span class="readonly-value">{{ stock(row).weightPerPieceKg.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}</span></td><td><span class="readonly-value">{{ stock(row).stockWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}</span></td><td><span class="readonly-value">{{ stock(row).stockPieces.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}</span></td><td><span class="readonly-value">{{ stock(row).stockPairs.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}</span></td><td><span class="readonly-value">{{ stock(row).stockDays.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="card table-shell">
          <header class="card-header"><div><h2>Turnos e tempo disponível</h2><p class="section-description">Horários e paradas planejadas de D3:J4.</p></div><div class="available-time"><Clock3 :size="16" />{{ availableHours.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }} h/dia</div></header>
          <div class="table-scroll">
            <table class="data-table editable-table shift-table">
              <thead><tr><th>Turno</th><th>Início</th><th>Fim</th><th>Ajuste virada (min)</th><th>Refeição (min)</th><th>Reuniões (min)</th><th>Minutos disponíveis</th><th>Horas disponíveis</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="row in shiftRows" :key="row.id" :class="{ 'inactive-row': row.status === 'inactive' }">
                  <td><input v-model.trim="row.label" class="table-input" required aria-label="Nome do turno" /></td><td><input v-model="row.startTime" class="table-input" type="time" aria-label="Início do turno" /></td><td><input v-model="row.endTime" class="table-input" type="time" aria-label="Fim do turno" /></td><td><input v-model.number="row.rolloverMinutes" class="table-input number-input" type="number" min="0" step="1" aria-label="Ajuste de virada" /></td><td><input v-model.number="row.mealMinutes" class="table-input number-input" type="number" min="0" step="1" aria-label="Tempo de refeição" /></td><td><input v-model.number="row.meetingMinutes" class="table-input number-input" type="number" min="0" step="1" aria-label="Tempo de reuniões" /></td>
                  <td><span class="readonly-value">{{ shiftMinutes(row) }}</span></td><td><span class="readonly-value">{{ (shiftMinutes(row) / 60).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}</span></td><td><select v-model="row.status" class="table-select table-status-select" :class="{ inactive: row.status === 'inactive' }"><option value="active">Ativo</option><option value="inactive">Inativo</option></select></td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <FormSourcePanel><strong class="source-title"><CalendarDays :size="15" />Regra preservada</strong><p>Veículos/dia, reforço, dias, turnos e geometria são inputs. Pares/dia, peso e dias de estoque usam somente as fórmulas confirmadas no Excel.</p></FormSourcePanel>
    </section>
  </div>
</template>

<style scoped>
.metric-icon.green { background: var(--success-soft); color: var(--success); }
.metric-icon.lavender { background: #f1efff; color: #6b5ce7; }
.editable-table { min-width: 1120px; }
.material-table { min-width: 1380px; }
.shift-table { min-width: 1040px; }
.text-wide { min-width: 130px; }
.available-time, .source-title { display: inline-flex; align-items: center; gap: 6px; }
.available-time { color: var(--brand-blue-strong); font-family: var(--font-data); font-size: .8rem; font-weight: 700; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
@media (max-width: 720px) { .page-actions { align-items: stretch; flex-direction: column; } }
</style>
