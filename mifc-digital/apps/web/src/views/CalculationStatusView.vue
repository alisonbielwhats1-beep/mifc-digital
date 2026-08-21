<script setup lang="ts">
import { calculationRuleCatalog, excelParityReferences } from "@mifc/calculation-engine";
import { CheckCircle2, CircleDashed, FlaskConical, Search, ShieldAlert } from "@lucide/vue";
import { computed, ref } from "vue";

type StatusFilter = "all" | "validated" | "pending";
const search = ref("");
const statusFilter = ref<StatusFilter>("all");
const validatedRules = computed(() => calculationRuleCatalog.filter((rule) => rule.validationStatus === "validated"));
const pendingRules = computed(() => calculationRuleCatalog.filter((rule) => rule.validationStatus !== "validated"));
const parityComparisons = excelParityReferences.pairsPerDay.length + excelParityReferences.shifts.length + excelParityReferences.materialStock.length * 2 + excelParityReferences.wipDays.length + excelParityReferences.processTime.length + excelParityReferences.totals.length + 2;
const visibleRules = computed(() => {
  const term = search.value.trim().toLocaleLowerCase("pt-BR");
  return calculationRuleCatalog.filter((rule) => {
    const matchesStatus = statusFilter.value === "all" || (statusFilter.value === "validated" ? rule.validationStatus === "validated" : rule.validationStatus !== "validated");
    const matchesSearch = !term || `${rule.name} ${rule.code} ${rule.category} ${rule.sourceReference}`.toLocaleLowerCase("pt-BR").includes(term);
    return matchesStatus && matchesSearch;
  });
});
</script>

<template>
  <div class="page calculation-page">
    <div class="page-heading"><div><h1>Análises</h1><p>Rastreabilidade do Calculation Engine e paridade com o MIPS.</p></div><span class="engine-version"><span></span>Engine v1 ativo</span></div>

    <section class="audit-strip" aria-label="Estado da validação">
      <div class="audit-intro"><span class="audit-kicker">Checkpoint do Prompt 4</span><strong>Cada resultado precisa provar de onde veio.</strong><p>Regras sem fórmula ou unidade confirmada permanecem bloqueadas.</p></div>
      <article><CheckCircle2 :size="22" /><div><span>Regras validadas</span><strong>{{ validatedRules.length }}</strong><small>Disponíveis para execução</small></div></article>
      <article><FlaskConical :size="22" /><div><span>Comparações</span><strong>{{ parityComparisons }}</strong><small>Excel e PBIP</small></div></article>
      <article class="pending"><ShieldAlert :size="22" /><div><span>Regras pendentes</span><strong>{{ pendingRules.length }}</strong><small>Execução bloqueada</small></div></article>
    </section>

    <section class="parity-grid">
      <article class="card parity-card"><div class="parity-marker blue"></div><div><span>Volume e turnos</span><strong>6/6</strong><p>FH, VM, Scania, DAF e dois turnos.</p></div><CheckCircle2 :size="20" /></article>
      <article class="card parity-card"><div class="parity-marker green"></div><div><span>Material e estoque</span><strong>8/8</strong><p>Peso e dias Slitter dos quatro clientes.</p></div><CheckCircle2 :size="20" /></article>
      <article class="card parity-card"><div class="parity-marker violet"></div><div><span>WIP e processo</span><strong>8/8</strong><p>Amostras das quatro linhas do MIFC.</p></div><CheckCircle2 :size="20" /></article>
      <article class="card parity-card"><div class="parity-marker orange"></div><div><span>Logística e totais</span><strong>6/6</strong><p>Movimento, transporte e Lead Time.</p></div><CheckCircle2 :size="20" /></article>
    </section>

    <section class="card rules-card">
      <header class="rules-header">
        <div><h2>Catálogo de regras</h2><p>Versão, unidade, entradas, origem e estado de execução.</p></div>
        <div class="rule-tools">
          <div class="segmented" aria-label="Filtrar por validação">
            <button type="button" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">Todas</button>
            <button type="button" :class="{ active: statusFilter === 'validated' }" @click="statusFilter = 'validated'">Validadas</button>
            <button type="button" :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">Pendentes</button>
          </div>
          <label class="rule-search"><Search :size="16" /><span class="sr-only">Buscar regra</span><input v-model="search" type="search" placeholder="Buscar regra..." /></label>
        </div>
      </header>
      <div class="table-scroll">
        <table class="data-table rules-table">
          <thead><tr><th>Regra</th><th>Categoria</th><th>Versão</th><th>Unidade</th><th>Entradas</th><th>Referência</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="rule in visibleRules" :key="rule.id" :class="{ pending: rule.validationStatus !== 'validated' }">
              <td><strong>{{ rule.name }}</strong><code>{{ rule.code }}</code></td><td>{{ rule.category }}</td><td>v{{ rule.version }}</td><td>{{ rule.unit }}</td><td><span class="input-count">{{ rule.inputKeys.length }}</span>{{ rule.inputKeys.join(', ') }}</td><td class="source-reference">{{ rule.sourceReference }}</td>
              <td><span class="rule-status" :class="rule.validationStatus"><CheckCircle2 v-if="rule.validationStatus === 'validated'" :size="14" /><CircleDashed v-else :size="14" />{{ rule.validationStatus === 'validated' ? 'Validada' : 'Pendente' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.calculation-page { gap: 16px; }
.engine-version { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px; border: 1px solid #bfe4cc; border-radius: 999px; background: var(--success-soft); color: var(--success); font-size: .75rem; font-weight: 700; }
.engine-version span { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 4px rgba(45, 155, 86, .12); }
.audit-strip { display: grid; grid-template-columns: minmax(300px, 1.45fr) repeat(3, minmax(150px, .55fr)); overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: #10223e; color: white; box-shadow: var(--shadow-card); }
.audit-intro, .audit-strip article { min-height: 132px; padding: 20px; }
.audit-intro { background: linear-gradient(100deg, #10223e, #183c73); }
.audit-kicker { color: #9fbaff; font-size: .68rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.audit-intro strong { display: block; margin-top: 10px; font-size: 1.15rem; }
.audit-intro p { margin: 5px 0 0; color: #c5d0df; font-size: .78rem; }
.audit-strip article { display: flex; align-items: flex-start; gap: 11px; border-left: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.035); }
.audit-strip article > svg { margin-top: 3px; color: #76df9d; }
.audit-strip article.pending > svg { color: #ffbd72; }
.audit-strip article span, .audit-strip article small { display: block; color: #afbdcf; font-size: .72rem; }
.audit-strip article strong { display: block; margin: 3px 0; font-family: var(--font-data); font-size: 1.8rem; }
.parity-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.parity-card { position: relative; display: grid; min-height: 108px; grid-template-columns: 5px 1fr auto; align-items: center; gap: 14px; overflow: hidden; padding: 16px; }
.parity-marker { align-self: stretch; width: 5px; border-radius: 999px; background: var(--brand-blue); }.parity-marker.green { background: var(--success); }.parity-marker.violet { background: #6b5ce7; }.parity-marker.orange { background: var(--warning); }
.parity-card span { color: var(--text-secondary); font-size: .75rem; font-weight: 600; }.parity-card strong { display: block; margin: 2px 0; font-family: var(--font-data); font-size: 1.15rem; }.parity-card p { margin: 0; color: var(--text-tertiary); font-size: .68rem; }.parity-card > svg { color: var(--success); }
.rules-card { overflow: hidden; }
.rules-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.rules-header h2, .rules-header p { margin: 0; }.rules-header h2 { font-size: 1rem; }.rules-header p { margin-top: 3px; color: var(--text-secondary); font-size: .74rem; }
.rule-tools { display: flex; align-items: center; gap: 10px; }.segmented { display: flex; padding: 3px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-muted); }.segmented button { min-height: 30px; padding: 0 10px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: .7rem; font-weight: 600; }.segmented button.active { background: white; color: var(--brand-blue-strong); box-shadow: 0 1px 3px rgba(16,34,62,.12); }
.rule-search { display: flex; min-height: 38px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-tertiary); }.rule-search input { width: 155px; border: 0; outline: 0; background: transparent; font-size: .75rem; }
.rules-table { min-width: 1250px; white-space: normal; }.rules-table td:first-child { min-width: 210px; }.rules-table td strong, .rules-table td code { display: block; }.rules-table td code { margin-top: 3px; color: var(--brand-blue-strong); font-family: var(--font-data); font-size: .67rem; }.rules-table tr.pending { background: #fffaf3; }.source-reference { max-width: 330px; color: var(--text-secondary); font-size: .72rem; }.input-count { display: inline-grid; width: 21px; height: 21px; place-items: center; margin-right: 6px; border-radius: 50%; background: var(--surface-selected); color: var(--brand-blue-strong); font-size: .65rem; font-weight: 700; }
.rule-status { display: inline-flex; min-height: 28px; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 999px; font-size: .69rem; font-weight: 700; }.rule-status.validated { background: var(--success-soft); color: var(--success); }.rule-status.mapped, .rule-status.pending { background: var(--warning-soft); color: var(--warning); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
@media (max-width: 1100px) { .audit-strip { grid-template-columns: 1fr 1fr 1fr; }.audit-intro { grid-column: 1 / -1; }.parity-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 760px) { .page-heading, .rules-header { align-items: flex-start; flex-direction: column; }.audit-strip { grid-template-columns: 1fr; }.audit-intro { grid-column: auto; }.audit-strip article { min-height: 92px; border-top: 1px solid rgba(255,255,255,.12); border-left: 0; }.parity-grid { grid-template-columns: 1fr; }.rule-tools { width: 100%; align-items: stretch; flex-direction: column; }.segmented button { flex: 1; }.rule-search input { width: 100%; } }
</style>
