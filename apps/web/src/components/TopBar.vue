<script setup lang="ts">
import { calculationRuleCatalog } from "@mifc/calculation-engine";
import { Bell, ChevronDown, CircleHelp, Menu, Search, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clientProcessLanes } from "@/domain/client-process-matrix";
import { searchGlobal, type GlobalSearchDocument } from "@/domain/global-search";
import { useContextStore } from "@/stores/context";
import { useMifcFormsStore } from "@/stores/mifc-forms";
import { useMifcLayoutStore } from "@/stores/mifc-layout";
import { useOperationsStore } from "@/stores/operations";
import { useUiStore } from "@/stores/ui";

interface SyncStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  automaticRefresh?: { active: boolean; refreshing: boolean; lastError: string | null; nextRefreshAt: string | null };
}

const context = useContextStore();
const ui = useUiStore();
const forms = useMifcFormsStore();
const layout = useMifcLayoutStore();
const operations = useOperationsStore();
const route = useRoute();
const router = useRouter();
const { selectedPlantId, selectedScenarioId, selectedYear } = storeToRefs(context);
const { activeRevisionId, isDirty: layoutDirty } = storeToRefs(layout);
const query = ref("");
const searchOpen = ref(false);
const helpOpen = ref(false);
const notificationsOpen = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);
const syncStatus = ref<SyncStatus | null>(null);
const apiOffline = ref(false);
let statusTimer: ReturnType<typeof setInterval> | undefined;

const symbolDocuments: GlobalSearchDocument[] = [
  ["process", "Processo", "Máquina ou etapa de transformação"], ["buffer", "Buffer", "WIP entre processos"],
  ["stock", "Estoque", "Matéria-prima ou produto acabado"], ["truck", "Transporte", "Movimentação e expedição"],
  ["kanban", "Kanban", "Sinal de reposição"], ["information", "Informação", "Documento ou instrução"],
].map(([id, label, description]) => ({ id:`symbol-${id}`,type:"Símbolo",label,description,keywords:[id,label],route:"/mifc/layout" }));

const searchDocuments = computed<GlobalSearchDocument[]>(() => {
  const documents: GlobalSearchDocument[] = [];
  for (const node of layout.activeRevision.nodes) documents.push({ id:`layout-${node.id}`,type:"Bloco do Layout",label:node.label.replace(/\n/g," "),description:`${node.properties.code || node.type} · ${node.properties.calculationKey || "sem medida"}`,keywords:[node.id,node.type,node.properties.code,node.properties.calculationKey],route:"/mifc/layout",focus:node.id });
  for (const row of forms.volumeRows) documents.push({id:`customer-${row.id}`,type:"Cliente",label:row.customer,description:`${row.model} · Volume`,keywords:[row.id,row.model],route:"/mifc/volume"});
  for (const row of forms.bufferRows) documents.push({id:`buffer-${row.id}`,type:"Buffer",label:row.point,description:`${row.customer} · ${row.inputProcess} → ${row.outputProcess}`,keywords:[row.id,row.type,row.origin],route:"/mifc/layout",focus:row.outputProcess});
  for (const product of operations.products) documents.push({id:`product-${product.id}`,type:"Produto",label:`${product.code} · ${product.description}`,description:`${product.customer || "Cliente pendente"} · ${product.family || "Sem família"}`,keywords:[product.material,product.productClass,product.sourceKey || ""],route:"/products",focus:product.id});
  for (const process of operations.processes) documents.push({id:`process-${process.id}`,type:"Processo",label:process.name,description:`${process.code} · ${process.powerBiMeasure || "medida pendente"}`,keywords:[process.code,process.demandMeasure,process.productionMeasure],route:"/mifc/layout",focus:process.layoutNodeId});
  for (const rule of calculationRuleCatalog) documents.push({id:`rule-${rule.code}`,type:"Regra",label:rule.name,description:`${rule.code} · ${rule.expression}`,keywords:[rule.code,rule.category,rule.sourceReference],route:"/mifc/analysis"});
  const measures = new Set(clientProcessLanes.flatMap((lane) => [lane.totalMeasureKey,...lane.mappings.flatMap((mapping) => [...mapping.processMeasureKeys,...mapping.stockMeasureKeys])]));
  for (const measure of measures) documents.push({id:`measure-${measure}`,type:"Medida Power BI",label:measure,description:"Medida catalogada na linhagem do Layout",keywords:["DAX","Power BI","linhagem"],route:"/mifc/layout"});
  return [...documents,...symbolDocuments];
});
const results = computed(() => searchGlobal(searchDocuments.value,query.value,12));

const help = computed(() => {
  if (route.path === "/mifc/layout") return { title:"Layout MIFC", items:["Clique em qualquer número para ver fórmula, entradas, filtros e origem.","Arraste blocos com o botão esquerdo. Use Ctrl/Shift para seleção em grupo.","Use o botão central a partir de qualquer elemento ou a ferramenta Mover tela para navegar.","Os símbolos de buffer mostram WIP, tempo e processos anterior/posterior.","A subida da linha indica participação confirmada do cliente; reta significa sem rota mapeada."] };
  if (route.path === "/mifc/capacity") return { title:"Capacidade", items:["Tempo de Ciclo — CT é informado em segundos por peça.","Capacidade nominal, turnos, tempo disponível e OEE são parâmetros de entrada.","Capacidade/dia só é calculada quando a regra específica estiver validada; referências importadas permanecem identificadas.","Valores Oracle/MES observados nunca são substituídos silenciosamente por zero."] };
  if (route.path === "/mifc/buffers") return { title:"Buffer e Estoque", items:["Dias de WIP = peças ÷ 2 ÷ pares por dia.","Valores manuais são editáveis; valores Oracle/MES permanecem bloqueados.","Processo de entrada e saída determinam a posição do símbolo no Layout."] };
  return { title:String(route.meta.title ?? "MIFC Digital"),items:["Use a busca para localizar clientes, processos, produtos, símbolos, regras, medidas, códigos e blocos.","A origem de cada valor indica se ele é manual, importado, observado no MES ou calculado.","Itens sem fonte confiável aparecem como — ou pendentes."] };
});

const notifications = computed(() => {
  const items: Array<{severity:"danger"|"warning"|"info";title:string;detail:string;route:string}> = [];
  if (apiOffline.value) items.push({severity:"danger",title:"API local offline",detail:"Não foi possível consultar o diagnóstico Oracle/MES.",route:"/integrations"});
  else if (!syncStatus.value?.connected) items.push({severity:"warning",title:"Oracle/MES desconectado",detail:"Nenhum cache operacional conectado nesta sessão.",route:"/integrations"});
  if (syncStatus.value?.automaticRefresh?.lastError) items.push({severity:"danger",title:"Falha na última atualização",detail:syncStatus.value.automaticRefresh.lastError,route:"/integrations"});
  if (syncStatus.value?.lastSyncedAt) { const age=Date.now()-new Date(syncStatus.value.lastSyncedAt).getTime();if(age>10*60_000)items.push({severity:"warning",title:"Dados desatualizados",detail:`Última consulta bem-sucedida: ${new Date(syncStatus.value.lastSyncedAt).toLocaleString("pt-BR")}.`,route:"/integrations"}); }
  const incompleteBuffers=forms.bufferRows.filter((row)=>row.status==="active"&&(!row.inputProcess.trim()||!row.outputProcess.trim()||row.pairsPerDay<=0)).length;
  if(incompleteBuffers)items.push({severity:"warning",title:"Buffer sem configuração",detail:`${incompleteBuffers} ponto(s) sem rota ou ritmo diário completo.`,route:"/mifc/buffers"});
  const pendingCapacity=forms.capacityRows.filter((row)=>row.status==="active"&&row.referenceCapacityPerDay===null).length;
  if(pendingCapacity)items.push({severity:"info",title:"Cálculo de capacidade pendente",detail:`${pendingCapacity} processo(s) sem capacidade/dia validada.`,route:"/mifc/capacity"});
  if(operations.actionSummary.overdue)items.push({severity:"danger",title:"Ações atrasadas",detail:`${operations.actionSummary.overdue} ação(ões) ultrapassaram o prazo.`,route:"/actions"});
  return items;
});

async function openSearch() { searchOpen.value=true;helpOpen.value=false;notificationsOpen.value=false;await nextTick();searchInput.value?.focus(); }
function closeSearch() { searchOpen.value=false;query.value=""; }
async function chooseResult(result: GlobalSearchDocument) { closeSearch();await router.push({path:result.route,query:result.focus?{focus:result.focus}:{}}); }
async function chooseNotification(item: {route:string}) { notificationsOpen.value=false;await router.push(item.route); }
function switchGlobalRevision(event: Event) {
  const revisionId = (event.target as HTMLSelectElement).value;
  if (!revisionId || revisionId === layout.activeRevisionId) return;
  forms.switchRevision(revisionId);
  layout.switchRevision(revisionId);
  context.selectedRevisionId = revisionId;
  context.persist();
}
function onGlobalKeydown(event: KeyboardEvent) { if((event.ctrlKey||event.metaKey)&&event.key.toLocaleLowerCase()==="k"){event.preventDefault();void openSearch();}else if(event.key==="Escape"){closeSearch();helpOpen.value=false;notificationsOpen.value=false;} }
async function loadSyncStatus(){try{const response=await fetch("/api/oracle/sync-status",{cache:"no-store"});if(!response.ok)throw new Error();syncStatus.value=await response.json() as SyncStatus;apiOffline.value=false;}catch{apiOffline.value=true;}}
watch([selectedPlantId, selectedScenarioId, selectedYear], () => context.persist());
watch(activeRevisionId, (revisionId) => { context.selectedRevisionId=revisionId;context.persist(); });
onMounted(()=>{context.hydrate();layout.hydrate();forms.hydrate(layout.activeRevisionId);operations.hydrate();context.selectedRevisionId=layout.activeRevisionId;context.persist();window.addEventListener("keydown",onGlobalKeydown);void loadSyncStatus();statusTimer=setInterval(()=>void loadSyncStatus(),30_000);});
onBeforeUnmount(()=>{window.removeEventListener("keydown",onGlobalKeydown);if(statusTimer)clearInterval(statusTimer);});
</script>

<template>
  <header class="topbar">
    <div class="brand-zone">
      <button class="mobile-menu" type="button" aria-label="Abrir navegação" @click="ui.toggleMobileNavigation">
        <Menu :size="21" aria-hidden="true" />
      </button>
      <RouterLink class="wordmark" to="/overview" aria-label="Metalsa — início">
        <img src="/metalsa-wordmark.svg" alt="Metalsa" width="146" height="22" />
      </RouterLink>
    </div>

    <div class="context-selectors" aria-label="Contexto da revisão">
      <label class="context-field">
        <span>Planta</span>
        <span class="select-wrap">
          <select v-model="selectedPlantId" aria-label="Planta">
            <option v-for="plant in context.plants" :key="plant.id" :value="plant.id">{{ plant.code }} - {{ plant.name }}</option>
          </select>
          <ChevronDown :size="14" aria-hidden="true" />
        </span>
      </label>

      <label class="context-field compact-field">
        <span>Ano</span>
        <span class="select-wrap">
          <select v-model.number="selectedYear" aria-label="Ano">
            <option v-for="year in context.availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <ChevronDown :size="14" aria-hidden="true" />
        </span>
      </label>

      <label class="context-field">
        <span>Cenário</span>
        <span class="select-wrap">
          <select v-model="selectedScenarioId" aria-label="Cenário">
            <option v-for="scenario in context.scenariosForYear" :key="scenario.id" :value="scenario.id">{{ scenario.name }}</option>
          </select>
          <ChevronDown :size="14" aria-hidden="true" />
        </span>
      </label>

      <label class="context-field revision-field">
        <span>Revisão</span>
        <span class="select-wrap">
          <select :value="layout.activeRevisionId" aria-label="Revisão" @change="switchGlobalRevision">
            <option v-for="revision in layout.revisions" :key="revision.id" :value="revision.id">{{ revision.label }}</option>
          </select>
          <i :class="{ dirty: layoutDirty || forms.isDirty }" :aria-label="layoutDirty || forms.isDirty ? 'Alterações não salvas' : 'Revisão salva'"></i>
          <ChevronDown :size="14" aria-hidden="true" />
        </span>
      </label>
    </div>

    <div class="topbar-tools">
      <button class="search-box search-trigger" type="button" aria-label="Abrir busca do MIFC" @click="openSearch">
        <Search :size="17" aria-hidden="true" />
        <span>Buscar no MIFC...</span>
        <kbd>Ctrl K</kbd>
      </button>
      <button class="icon-button" type="button" aria-label="Ajuda" @click="helpOpen=true;notificationsOpen=false;searchOpen=false"><CircleHelp :size="20" aria-hidden="true" /></button>
      <div class="notification-wrap"><button class="icon-button" type="button" aria-label="Notificações" :aria-expanded="notificationsOpen" @click="notificationsOpen=!notificationsOpen;helpOpen=false;searchOpen=false"><Bell :size="20" aria-hidden="true" /><span v-if="notifications.length" class="notification-badge">{{ notifications.length }}</span></button><section v-if="notificationsOpen" class="notification-popover"><header><strong>Notificações</strong><small>{{ notifications.length }} ativa(s)</small></header><p v-if="!notifications.length" class="empty-notifications">Nenhum alerta ativo.</p><button v-for="item in notifications" :key="`${item.title}-${item.detail}`" type="button" :class="item.severity" @click="chooseNotification(item)"><i></i><span><strong>{{ item.title }}</strong><small>{{ item.detail }}</small></span></button><RouterLink to="/integrations" @click="notificationsOpen=false">Abrir diagnóstico de conexão</RouterLink></section></div>
    </div>
  </header>

  <div v-if="searchOpen" class="overlay-backdrop search-backdrop" @click.self="closeSearch">
    <section class="global-search-dialog" role="dialog" aria-label="Busca global do MIFC">
      <label><Search :size="20" /><input ref="searchInput" v-model="query" type="search" aria-label="Buscar no MIFC" placeholder="Cliente, máquina, processo, produto, símbolo, regra, medida ou código..." /><button type="button" aria-label="Fechar busca" @click="closeSearch"><X :size="18" /></button></label>
      <div v-if="query && results.length" class="search-results" role="listbox" aria-label="Resultados da busca"><button v-for="result in results" :key="result.id" type="button" role="option" @click="chooseResult(result)"><span>{{ result.type }}</span><strong>{{ result.label }}</strong><small>{{ result.description }}</small></button></div>
      <p v-else-if="query" class="search-empty">Nenhum resultado. Tente um nome, código ou medida Power BI.</p>
      <p v-else class="search-hint">A busca cobre os cadastros locais, o Layout, as regras do Calculation Engine e as medidas catalogadas.</p>
    </section>
  </div>

  <div v-if="helpOpen" class="overlay-backdrop" @click.self="helpOpen=false">
    <section class="help-dialog" role="dialog" aria-label="Ajuda desta tela">
      <header><div><small>AJUDA CONTEXTUAL</small><h2>{{ help.title }}</h2></div><button type="button" aria-label="Fechar ajuda" @click="helpOpen=false"><X :size="20" /></button></header>
      <ul><li v-for="item in help.items" :key="item">{{ item }}</li></ul>
      <footer><RouterLink to="/mifc/analysis" @click="helpOpen=false">Abrir regras e paridade</RouterLink></footer>
    </section>
  </div>
</template>

<style scoped>
.topbar {
  position: fixed;
  z-index: 80;
  inset: 0 0 auto 0;
  display: grid;
  height: var(--header-height);
  grid-template-columns: var(--sidebar-width) minmax(480px, 1fr) auto;
  align-items: stretch;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.98);
}

.brand-zone {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 24px;
  border-right: 1px solid var(--border-subtle);
}

.wordmark {
  display: flex;
  align-items: center;
}

.wordmark img {
  display: block;
  width: 146px;
  height: auto;
}

.mobile-menu {
  display: none;
}

.context-selectors {
  display: flex;
  min-width: 0;
  align-items: center;
}

.context-field {
  display: grid;
  min-width: 150px;
  height: 100%;
  align-content: center;
  gap: 2px;
  padding: 0 18px;
  border-right: 1px solid var(--border-subtle);
}

.compact-field {
  min-width: 96px;
}

.revision-field {
  min-width: 180px;
}

.context-field > span:first-child {
  color: var(--text-tertiary);
  font-size: 0.6875rem;
  font-weight: 500;
}

.select-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
}

.select-wrap select {
  min-width: 0;
  max-width: 150px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  appearance: none;
}

.select-wrap i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
}

.topbar-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
}

.search-box {
  display: flex;
  width: min(290px, 22vw);
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: #fbfcfe;
  color: var(--text-tertiary);
}

.select-wrap i.dirty { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-soft); }

.search-trigger {
  grid-template-columns: auto 1fr auto;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.search-box:focus-within {
  border-color: var(--brand-blue);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 0.8125rem;
}

.search-trigger > span {
  color: var(--text-tertiary);
  font-size: 0.8125rem;
}

.search-box kbd {
  color: var(--text-tertiary);
  font-family: var(--font-ui);
  font-size: 0.625rem;
}

.icon-button,
.avatar-button,
.mobile-menu {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
}

.notification-wrap { position: relative; }
.notification-badge { position:absolute;top:3px;right:2px;display:grid;min-width:17px;height:17px;place-items:center;padding:0 4px;border:2px solid #fff;border-radius:999px;background:var(--danger);color:#fff;font-size:8px;font-weight:800; }
.notification-popover { position:absolute;z-index:210;top:49px;right:0;width:340px;overflow:hidden;border:1px solid var(--border-subtle);border-radius:10px;background:#fff;box-shadow:var(--shadow-float); }
.notification-popover>header { display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid var(--border-subtle); }
.notification-popover>header strong { font-size:12px; }.notification-popover>header small { color:var(--text-tertiary);font-size:9px; }
.notification-popover>button { display:grid;width:100%;grid-template-columns:10px 1fr;gap:9px;padding:11px 14px;border:0;border-bottom:1px solid var(--border-subtle);background:#fff;text-align:left;cursor:pointer; }
.notification-popover>button:hover { background:var(--surface-muted); }.notification-popover>button i { width:8px;height:8px;margin-top:3px;border-radius:50%;background:var(--brand-blue); }.notification-popover>button.warning i { background:var(--warning); }.notification-popover>button.danger i { background:var(--danger); }
.notification-popover>button span,.notification-popover>button strong,.notification-popover>button small { display:block; }.notification-popover>button strong { color:var(--text-primary);font-size:10px; }.notification-popover>button small { margin-top:3px;color:var(--text-secondary);font-size:8px;line-height:1.35; }
.notification-popover>a { display:block;padding:11px 14px;color:var(--brand-blue);font-size:9px;font-weight:700;text-align:center; }.empty-notifications { margin:0;padding:18px;color:var(--text-secondary);font-size:10px;text-align:center; }

.overlay-backdrop { position:fixed;z-index:190;inset:0;display:grid;place-items:center;padding:20px;background:rgba(15,29,52,.42); }
.search-backdrop { align-items:start;padding-top:92px; }
.global-search-dialog { width:min(720px,94vw);overflow:hidden;border:1px solid var(--border-subtle);border-radius:12px;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.26); }
.global-search-dialog>label { display:grid;min-height:62px;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:0 15px;border-bottom:1px solid var(--border-subtle);color:var(--text-secondary); }
.global-search-dialog input { width:100%;height:46px;border:0;outline:0;font-size:15px; }.global-search-dialog label button,.help-dialog header button { display:grid;width:36px;height:36px;place-items:center;border:0;border-radius:50%;background:transparent; }
.search-results { display:grid;max-height:62vh;overflow-y:auto;padding:7px; }.search-results button { display:grid;grid-template-columns:110px 1fr;gap:2px 12px;padding:10px;border:0;border-radius:7px;background:#fff;text-align:left;cursor:pointer; }.search-results button:hover,.search-results button:focus-visible { outline:0;background:var(--surface-selected); }.search-results button>span { grid-row:1/3;color:var(--brand-blue);font-size:8px;font-weight:800;text-transform:uppercase; }.search-results strong { font-size:11px; }.search-results small { color:var(--text-secondary);font-size:9px; }.search-empty,.search-hint { margin:0;padding:22px;color:var(--text-secondary);font-size:10px;text-align:center; }
.help-dialog { width:min(560px,94vw);overflow:hidden;border-radius:12px;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.26); }.help-dialog>header { display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border-subtle); }.help-dialog header small { color:var(--brand-blue);font-size:8px;font-weight:800;letter-spacing:.08em; }.help-dialog h2 { margin:3px 0 0;font-size:18px; }.help-dialog ul { display:grid;gap:10px;margin:0;padding:20px 24px 20px 42px;color:var(--text-secondary);font-size:11px;line-height:1.5; }.help-dialog footer { padding:12px 20px;border-top:1px solid var(--border-subtle);text-align:right; }.help-dialog footer a { color:var(--brand-blue);font-size:10px;font-weight:700; }

.icon-button:hover,
.mobile-menu:hover {
  background: var(--surface-muted);
}

.avatar-button {
  background: var(--brand-blue-soft);
  color: var(--brand-blue-strong);
  font-size: 0.75rem;
  font-weight: 700;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 1180px) {
  .topbar {
    grid-template-columns: var(--sidebar-width) 1fr auto;
  }

  .context-field {
    min-width: 122px;
    padding-inline: 12px;
  }

  .compact-field {
    min-width: 80px;
  }

  .revision-field {
    min-width: 150px;
  }

  .search-box {
    display: none;
  }
}

@media (max-width: 860px) {
  .topbar {
    height: 64px;
    grid-template-columns: 190px 1fr auto;
  }

  .brand-zone {
    padding-inline: 14px;
    border-right: 0;
  }

  .mobile-menu {
    display: grid;
  }

  .context-field:not(.revision-field) {
    display: none;
  }

  .revision-field {
    border-left: 1px solid var(--border-subtle);
  }

  .topbar-tools {
    padding-inline: 10px;
  }

  .icon-button {
    display: none;
  }
}

@media (max-width: 560px) {
  .topbar {
    grid-template-columns: 1fr auto;
  }

  .context-selectors {
    display: none;
  }

  .wordmark img {
    width: 118px;
  }
}
</style>
