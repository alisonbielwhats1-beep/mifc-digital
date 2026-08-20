<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { AlertTriangle, CheckCircle2, Database, Eye, EyeOff, FileSpreadsheet, FolderSync, KeyRound, LoaderCircle, LockKeyhole, Network, RefreshCw, ShieldCheck, Upload } from "@lucide/vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";

interface OracleStatus {
  oracle: { host: string; port: number; serviceName: string; readOnly: boolean; liveReadsEnabled: boolean; credentialsConfigured: boolean };
  catalog: { total: number; enabled: number; pending: number };
}
interface CatalogQuery {
  id: string; powerBiObject: string; queryMode: "embedded-sql" | "navigation-m"; status: string; enabled: boolean; usedBy: string[];
}
interface SyncedTable {
  queryId: string; powerBiObject: string; usedBy: string[]; rowCount: number; columns: string[]; durationMs: number; syncedAt: string;
  maxRows: number; limitReached: boolean; refreshSeconds: number;
  delta: { added: number; removed: number; unchanged: number; changed: boolean };
}
interface SyncFailure { queryId: string; powerBiObject: string; message: string }
interface AutomaticRefreshStatus {
  active: boolean; refreshing: boolean; mode: "staggered-local-delta"; intervalSeconds: number; tickSeconds: number;
  startedAt: string | null; nextRefreshAt: string | null; lastCompletedAt: string | null; lastQueryId: string | null; lastError: string | null; reason: string | null;
}
interface SyncStatus {
  connected: boolean; tableCount: number; rowCount: number; lastSyncedAt: string | null; automaticRefresh: AutomaticRefreshStatus; tables: SyncedTable[];
}
interface ShippingScheduleStatus {
  ready: boolean; networkPath: string; source: "network" | "upload" | null; rowCount: number;
  fileName?: string; fileModifiedAt?: string | null; importedAt?: string; sheet?: string; columns?: string[];
  rejectedRows?: number; removedTrailingRows?: number; warnings?: string[]; clientCounts?: Record<string, number>;
  dateRange?: { first: string | null; last: string | null }; relationships?: string[];
}

const status = ref<OracleStatus | null>(null);
const queries = ref<CatalogQuery[]>([]);
const loading = ref(true);
const loadError = ref("");
const user = ref("");
const password = ref("");
const showPassword = ref(false);
const testState = ref<"idle" | "testing" | "success" | "error">("idle");
const testMessage = ref("");
const syncState = ref<"idle" | "syncing" | "success" | "partial" | "error">("idle");
const syncMessage = ref("");
const syncStatus = ref<SyncStatus | null>(null);
const syncFailures = ref<SyncFailure[]>([]);
const shippingStatus = ref<ShippingScheduleStatus | null>(null);
const shippingState = ref<"idle" | "loading" | "success" | "error">("idle");
const shippingMessage = ref("");
const uploadInput = ref<HTMLInputElement | null>(null);
let syncStatusTimer: ReturnType<typeof setInterval> | undefined;
const confirmedQueries = computed(() => queries.value.filter((query) => query.enabled));
const pendingQueries = computed(() => queries.value.filter((query) => !query.enabled));
const automaticRefreshLabel = computed(() => {
  const automatic = syncStatus.value?.automaticRefresh;
  if (!automatic?.active) return automatic?.reason ?? "Aguardando conexão inicial";
  if (automatic.refreshing) return `Atualizando ${automatic.lastQueryId ?? "tabela"}...`;
  return automatic.nextRefreshAt ? `Próxima leitura ${formatDateTime(automatic.nextRefreshAt)}` : "Ativa";
});
const shippingSourceLabel = computed(() => shippingStatus.value?.source === "network" ? "Rede compartilhada" : shippingStatus.value?.source === "upload" ? "Arquivo selecionado" : "Aguardando arquivo");
const shippingClientEntries = computed(() => Object.entries(shippingStatus.value?.clientCounts ?? {}).sort(([first], [second]) => first.localeCompare(second)));

function formatDateTime(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRefreshSeconds(value: number): string {
  return value < 60 ? `${value}s` : `${Math.round(value / 60)} min`;
}

function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

async function loadSyncStatus(): Promise<void> {
  const response = await fetch("/api/oracle/sync-status", { cache: "no-store" });
  syncStatus.value = await readJson<SyncStatus>(response);
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Não foi possível concluir a operação.");
  return body;
}

async function loadConfiguration(): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const [statusResponse, catalogResponse, syncResponse, shippingResponse] = await Promise.all([
      fetch("/api/oracle/status", { cache: "no-store" }),
      fetch("/api/oracle/catalog", { cache: "no-store" }),
      fetch("/api/oracle/sync-status", { cache: "no-store" }),
      fetch("/api/imports/shipping-schedule/status", { cache: "no-store" }),
    ]);
    status.value = await readJson<OracleStatus>(statusResponse);
    const catalog = await readJson<{ queries: CatalogQuery[] }>(catalogResponse);
    queries.value = catalog.queries;
    syncStatus.value = await readJson<SyncStatus>(syncResponse);
    shippingStatus.value = await readJson<ShippingScheduleStatus>(shippingResponse);
  } catch (error: unknown) {
    loadError.value = error instanceof Error ? error.message : "API local indisponível.";
  } finally {
    loading.value = false;
  }
}

async function refreshShippingScheduleFromNetwork(automatic = false): Promise<void> {
  shippingState.value = "loading";
  shippingMessage.value = automatic ? "Tentando ler a programação na rede..." : "Lendo a versão mais recente na rede...";
  try {
    const response = await fetch("/api/imports/shipping-schedule/network", { method: "POST" });
    shippingStatus.value = await readJson<ShippingScheduleStatus>(response);
    shippingState.value = "success";
    shippingMessage.value = `Programação atualizada: ${shippingStatus.value.rowCount.toLocaleString("pt-BR")} linhas válidas.`;
  } catch (error: unknown) {
    shippingState.value = "error";
    shippingMessage.value = `${error instanceof Error ? error.message : "Não foi possível acessar a rede."} Selecione o arquivo abaixo para continuar.`;
  }
}

function selectShippingFile(): void {
  uploadInput.value?.click();
}

async function uploadShippingSchedule(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  shippingState.value = "loading";
  shippingMessage.value = "Validando a estrutura e os relacionamentos do arquivo...";
  try {
    const response = await fetch("/api/imports/shipping-schedule/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-File-Name": encodeURIComponent(file.name),
        "X-File-Last-Modified": encodeURIComponent(new Date(file.lastModified).toISOString()),
      },
      body: file,
    });
    shippingStatus.value = await readJson<ShippingScheduleStatus>(response);
    shippingState.value = "success";
    shippingMessage.value = `Arquivo validado e carregado: ${shippingStatus.value.rowCount.toLocaleString("pt-BR")} linhas válidas.`;
  } catch (error: unknown) {
    shippingState.value = "error";
    shippingMessage.value = error instanceof Error ? error.message : "Não foi possível importar o arquivo selecionado.";
  } finally {
    input.value = "";
  }
}

async function syncApprovedTables(): Promise<void> {
  syncState.value = "syncing";
  syncMessage.value = "";
  syncFailures.value = [];
  try {
    const response = await fetch("/api/oracle/sync-approved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user.value, password: password.value }),
    });
    const result = await readJson<{ ok: boolean; message: string; tables: SyncedTable[]; failures: SyncFailure[] }>(response);
    syncMessage.value = result.message;
    syncFailures.value = result.failures;
    syncState.value = result.ok ? "success" : result.tables.length > 0 ? "partial" : "error";
    await loadSyncStatus();
  } catch (error: unknown) {
    syncState.value = "error";
    syncMessage.value = error instanceof Error ? error.message : "Falha ao carregar as tabelas aprovadas.";
  } finally {
    password.value = "";
  }
}

async function testConnection(): Promise<void> {
  testState.value = "testing";
  testMessage.value = "";
  try {
    const response = await fetch("/api/oracle/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user.value, password: password.value }),
    });
    const result = await readJson<{ message: string }>(response);
    testState.value = "success";
    testMessage.value = result.message;
  } catch (error: unknown) {
    testState.value = "error";
    testMessage.value = error instanceof Error ? error.message : "Falha ao testar a conexão.";
  } finally {
    password.value = "";
  }
}

onMounted(async () => {
  await loadConfiguration();
  if (!shippingStatus.value?.ready) await refreshShippingScheduleFromNetwork(true);
  syncStatusTimer = setInterval(() => void loadSyncStatus().catch(() => undefined), 15_000);
});
onBeforeUnmount(() => {
  if (syncStatusTimer) clearInterval(syncStatusTimer);
});
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><h1>Integrações</h1><p>Conexão Oracle preparada com proteção de leitura e catálogo fechado.</p></div>
      <button class="button button-secondary" type="button" :disabled="loading" @click="loadConfiguration"><RefreshCw :size="16" :class="{ spinning: loading }" /> Atualizar estado</button>
    </div>
    <div class="context-banner"><span><strong>{{ syncStatus?.automaticRefresh.active ? 'Atualização automática escalonada ativa.' : 'A atualização automática começa após a conexão inicial.' }}</strong> Uma tabela aprovada é lida por vez; a API compara as linhas localmente e mantém o Oracle em modo somente leitura.</span><DataOriginBadge origin="ORACLE_MES" /></div>
    <div v-if="loadError" class="api-warning" role="alert"><AlertTriangle :size="18" /><span><strong>API local indisponível.</strong> Reinicie a aplicação com <code>npm run dev</code>. {{ loadError }}</span></div>

    <section class="integration-card card">
      <div class="oracle-mark"><Database :size="30" aria-hidden="true" /><span>ORACLE<br /><strong>MES</strong></span></div>
      <div class="integration-title"><div><h2>Oracle MES</h2><span class="status-pill" :class="status?.oracle.liveReadsEnabled ? '' : 'warning'">{{ status?.oracle.liveReadsEnabled ? 'Leituras liberadas' : 'Leituras pausadas' }}</span></div><p>Produção, estoque, paradas, WIP e segregação — somente por consultas do PBIP aprovado.</p></div>
      <div class="safety-seal"><ShieldCheck :size="18" /><span>Proteção</span><strong>READ ONLY</strong></div>
    </section>

    <section class="card shipping-card">
      <header class="shipping-header">
        <div class="shipping-title"><span class="shipping-icon"><FileSpreadsheet :size="23" /></span><div><span class="eyebrow">Programação de embarque</span><h2>Arquivo operacional atualizado</h2><p>O app valida a aba <strong>Data Embarque</strong> e reaplica os relacionamentos e filtros do Power BI.</p></div></div>
        <span class="status-pill" :class="shippingStatus?.ready ? '' : 'warning'">{{ shippingSourceLabel }}</span>
      </header>
      <div class="network-path"><span>Caminho monitorado</span><code>{{ shippingStatus?.networkPath ?? '\\\\metbrosawfse01\\Publico\\PowerBI\\Logística\\Programacao_embarque.xlsx' }}</code></div>
      <div class="shipping-actions">
        <button class="button button-secondary" type="button" :disabled="shippingState === 'loading'" @click="refreshShippingScheduleFromNetwork(false)"><LoaderCircle v-if="shippingState === 'loading'" class="spinning" :size="17" /><FolderSync v-else :size="17" /> Atualizar da rede</button>
        <button class="button button-primary" type="button" :disabled="shippingState === 'loading'" @click="selectShippingFile"><Upload :size="17" /> Selecionar arquivo .xlsx</button>
        <input ref="uploadInput" class="visually-hidden" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="uploadShippingSchedule" />
      </div>
      <div v-if="shippingStatus?.ready" class="shipping-metrics">
        <div><span>Linhas válidas</span><strong>{{ shippingStatus.rowCount.toLocaleString('pt-BR') }}</strong></div>
        <div><span>Período</span><strong>{{ formatCalendarDate(shippingStatus.dateRange?.first) }} a {{ formatCalendarDate(shippingStatus.dateRange?.last) }}</strong></div>
        <div><span>Clientes detectados</span><strong>{{ shippingClientEntries.map(([client, count]) => `${client}: ${count}`).join(' · ') || '—' }}</strong></div>
        <div><span>Arquivo atualizado</span><strong>{{ shippingStatus.fileModifiedAt ? formatDateTime(shippingStatus.fileModifiedAt) : 'Horário não informado' }}</strong></div>
      </div>
      <div v-if="shippingMessage" class="test-result shipping-result" :class="shippingState" role="status"><CheckCircle2 v-if="shippingState === 'success'" :size="18" /><AlertTriangle v-else-if="shippingState === 'error'" :size="18" /><LoaderCircle v-else class="spinning" :size="18" /><span>{{ shippingMessage }}</span></div>
      <ul v-if="shippingStatus?.ready && shippingStatus.warnings?.length" class="shipping-warnings"><li v-for="warning in shippingStatus.warnings" :key="warning">{{ warning }}</li></ul>
      <p class="relationship-note"><Network :size="16" /><span><strong>Contexto preservado:</strong> chaves FH, VM, SCANIA, DAF e DAF Slitters; filtro diário de Calendar[Date]; Data do embarque a partir de hoje; cliente e operação definidos em cada bloco.</span></p>
    </section>

    <section class="card semantic-card">
      <header class="semantic-header"><div class="shipping-title"><span class="semantic-icon"><Network :size="23" /></span><div><span class="eyebrow">Diagnóstico de referência</span><h2>Power BI / Semantic Model</h2><p>Linhas, medidas e relacionamentos inventariados no PBIP usado como linhagem do aplicativo.</p></div></div><span class="status-pill warning">Sem conexão online</span></header>
      <div class="semantic-notice"><AlertTriangle :size="18" /><span><strong>Sem conexão online com o Power BI.</strong> Estes números são o último inventário validado do modelo, não um estado em tempo real.</span></div>
      <div class="semantic-metrics"><div><span>Medidas inventariadas</span><strong>309</strong></div><div><span>Usadas no Layout</span><strong>62</strong></div><div><span>Fora do Layout</span><strong>247</strong></div><div><span>Filtro temporal</span><strong>Calendar[Date]</strong></div></div>
      <p class="relationship-note"><Network :size="16" /><span><strong>Relacionamentos preservados:</strong> data, cliente, produto, operação e recurso. A paridade de cada processo aparece como Validado, Divergente ou Pendente no cadastro técnico.</span></p>
    </section>

    <section class="workspace-grid">
      <article class="card credential-card">
        <header class="card-header"><div><span class="eyebrow">Acesso somente leitura</span><h2>Entrar com usuário e senha</h2></div><KeyRound :size="21" aria-hidden="true" /></header>
        <form class="credential-form" autocomplete="off" @submit.prevent="testConnection">
          <label><span>Usuário Oracle</span><input v-model.trim="user" name="oracle-test-user" autocomplete="off" required placeholder="Seu usuário somente leitura" /></label>
          <label><span>Senha</span><div class="password-field"><input v-model="password" name="oracle-test-password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required placeholder="Digite somente para testar" /><button type="button" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div></label>
          <p class="privacy-note"><LockKeyhole :size="15" /> A senha é enviada apenas à API local durante a operação e apagada do formulário ao terminar.</p>
          <div class="access-actions">
            <button class="button button-secondary" type="submit" :disabled="testState === 'testing' || syncState === 'syncing' || !status"><LoaderCircle v-if="testState === 'testing'" class="spinning" :size="17" /><Network v-else :size="17" />{{ testState === 'testing' ? 'Testando...' : 'Testar sem consultar' }}</button>
            <button class="button button-primary" type="button" :disabled="syncState === 'syncing' || testState === 'testing' || !status?.oracle.liveReadsEnabled || !user || !password" :title="status?.oracle.liveReadsEnabled ? 'Executar consultas aprovadas' : 'Ative ORACLE_LIVE_READS_ENABLED para liberar a leitura'" @click="syncApprovedTables"><LoaderCircle v-if="syncState === 'syncing'" class="spinning" :size="17" /><Database v-else :size="17" />{{ syncState === 'syncing' ? 'Carregando...' : 'Conectar tabelas aprovadas' }}</button>
          </div>
        </form>
        <div v-if="testMessage" class="test-result" :class="testState" role="status"><CheckCircle2 v-if="testState === 'success'" :size="18" /><AlertTriangle v-else :size="18" /><span>{{ testMessage }}</span></div>
        <div v-if="syncMessage" class="test-result" :class="syncState" role="status"><CheckCircle2 v-if="syncState === 'success'" :size="18" /><AlertTriangle v-else :size="18" /><div><strong>{{ syncMessage }}</strong><ul v-if="syncFailures.length"><li v-for="failure in syncFailures" :key="failure.queryId">{{ failure.powerBiObject }}: {{ failure.message }}</li></ul></div></div>
      </article>

      <article class="card environment-card">
        <header class="card-header"><div><span class="eyebrow">Ambiente local</span><h2>Destino configurado</h2></div></header>
        <div class="environment-list">
          <div><span>Host</span><strong>{{ status?.oracle.host ?? 'Carregando...' }}</strong></div><div><span>Porta</span><strong>{{ status?.oracle.port ?? '—' }}</strong></div>
          <div><span>Serviço</span><strong>{{ status?.oracle.serviceName ?? '—' }}</strong></div><div><span>Modo</span><strong class="safe-value"><ShieldCheck :size="15" /> Somente leitura</strong></div>
          <div><span>Credenciais no ambiente</span><strong>{{ status?.oracle.credentialsConfigured ? 'Configuradas' : 'Não armazenadas' }}</strong></div><div><span>Leituras de dados</span><strong class="paused-value">{{ status?.oracle.liveReadsEnabled ? 'Liberadas' : 'Desativadas' }}</strong></div>
          <div><span>Tabelas carregadas</span><strong>{{ syncStatus?.tableCount ?? 0 }}</strong></div><div><span>Linhas em memória local</span><strong>{{ (syncStatus?.rowCount ?? 0).toLocaleString('pt-BR') }}</strong></div>
          <div><span>Atualização automática</span><strong :class="syncStatus?.automaticRefresh.active ? 'safe-value' : 'paused-value'">{{ syncStatus?.automaticRefresh.active ? 'Ativa' : 'Aguardando' }}</strong></div><div><span>Próxima atividade</span><strong>{{ automaticRefreshLabel }}</strong></div>
        </div>
      </article>
    </section>

    <section v-if="syncStatus?.tables.length" class="card sync-card">
      <header class="card-header"><div><span class="eyebrow">Leitura atual</span><h2>Tabelas conectadas em memória local</h2><p>Os dados permanecem apenas na API local enquanto o projeto estiver em execução.</p></div><span class="query-status confirmed">READ ONLY</span></header>
      <div v-if="syncStatus.automaticRefresh.lastError" class="api-warning" role="alert"><AlertTriangle :size="18"/><span><strong>Última atualização automática falhou.</strong> {{ syncStatus.automaticRefresh.lastError }}</span></div>
      <div class="catalog-table-wrap"><table class="catalog-table"><thead><tr><th>Tabela</th><th>Uso</th><th>Linhas</th><th>Frequência</th><th>Alterações</th><th>Colunas</th><th>Tempo</th></tr></thead><tbody><tr v-for="table in syncStatus.tables" :key="table.queryId"><td><strong>{{ table.powerBiObject }}</strong><code>{{ table.queryId }}</code></td><td>{{ table.usedBy.join(', ') }}</td><td><span :class="{ 'limit-warning': table.limitReached }">{{ table.rowCount.toLocaleString('pt-BR') }}<template v-if="table.limitReached"> / limite {{ table.maxRows.toLocaleString('pt-BR') }}</template></span></td><td>A cada {{ formatRefreshSeconds(table.refreshSeconds) }}<code>{{ formatDateTime(table.syncedAt) }}</code></td><td><span v-if="table.delta.changed" class="delta-changed">+{{ table.delta.added }} / −{{ table.delta.removed }}</span><span v-else>Sem mudança</span></td><td>{{ table.columns.join(', ') }}</td><td>{{ table.durationMs.toLocaleString('pt-BR') }} ms</td></tr></tbody></table></div>
    </section>

    <section class="security-grid">
      <article class="card"><div class="security-icon"><LockKeyhole :size="21" /></div><h2>Credenciais efêmeras</h2><p>O formulário não usa armazenamento local e limpa a senha depois de cada tentativa.</p></article>
      <article class="card"><div class="security-icon"><ShieldCheck :size="21" /></div><h2>Transação protegida</h2><p>Consultas futuras usam transação READ ONLY, sem commit e com rollback obrigatório.</p></article>
      <article class="card"><div class="security-icon"><Network :size="21" /></div><h2>SQL fechado</h2><p>O navegador envia apenas o ID da consulta; o SQL vem do PBIP e precisa manter a assinatura aprovada.</p></article>
    </section>

    <section class="card catalog-card">
      <header class="card-header catalog-header"><div><span class="eyebrow">Allowlist do Power BI</span><h2>Catálogo de consultas Oracle</h2><p>Consultas SQL localizadas no MIFC atual e objetos que ainda dependem de materialização.</p></div><div class="catalog-metrics"><div><strong>{{ confirmedQueries.length }}</strong><span>confirmadas</span></div><div><strong>{{ pendingQueries.length }}</strong><span>pendentes</span></div></div></header>
      <div class="catalog-table-wrap"><table class="catalog-table"><thead><tr><th>Objeto Power BI</th><th>Modo</th><th>Uso mapeado</th><th>Estado</th></tr></thead><tbody>
        <tr v-for="query in queries" :key="query.id"><td><strong>{{ query.powerBiObject }}</strong><code>{{ query.id }}</code></td><td>{{ query.queryMode === 'embedded-sql' ? 'SQL embutido' : query.enabled ? 'Navegação M → SELECT' : 'Navegação M' }}</td><td>{{ query.usedBy.length ? query.usedBy.join(', ') : 'A validar no layout' }}</td><td><span class="query-status" :class="query.enabled ? 'confirmed' : 'pending'">{{ query.enabled ? query.queryMode === 'navigation-m' ? 'Materializada e protegida' : 'Confirmada no PBIP' : 'Materialização pendente' }}</span></td></tr>
        <tr v-if="!loading && queries.length === 0"><td colspan="4">Catálogo não carregado.</td></tr>
      </tbody></table></div>
    </section>
  </div>
</template>

<style scoped>
.integration-card{display:grid;grid-template-columns:130px 1fr auto;align-items:center;gap:20px;padding:20px}.oracle-mark{display:flex;min-height:84px;align-items:center;justify-content:center;gap:10px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);color:#d13b2f;font-size:.75rem;line-height:1.2}.oracle-mark strong{color:var(--text-primary);font-size:1rem}.integration-title>div{display:flex;align-items:center;gap:10px}.integration-title h2,.integration-title p{margin:0}.integration-title h2{font-size:1.2rem}.integration-title p{margin-top:5px;color:var(--text-secondary);font-size:.8125rem}.safety-seal{display:grid;grid-template-columns:auto auto;align-items:center;gap:2px 7px;padding:10px 14px;border:1px solid #a7dfb8;border-radius:9px;background:#f0fbf3;color:#15803d;font-size:.68rem}.safety-seal svg{grid-row:1/3}.safety-seal strong{font-size:.75rem;letter-spacing:.04em}
.shipping-card{display:grid;gap:16px;padding:20px}.shipping-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.shipping-title{display:flex;align-items:flex-start;gap:12px}.shipping-title h2,.shipping-title p{margin:0}.shipping-title h2{margin-top:3px;font-size:1.05rem}.shipping-title p{margin-top:5px;color:var(--text-secondary);font-size:.78rem}.shipping-icon{display:grid;width:42px;height:42px;flex:0 0 auto;place-items:center;border-radius:10px;background:#eaf8ee;color:#15803d}.network-path{display:grid;gap:5px;padding:11px 13px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-subtle)}.network-path span{color:var(--text-tertiary);font-size:.67rem;text-transform:uppercase}.network-path code{overflow-wrap:anywhere;color:var(--text-secondary);font-size:.72rem}.shipping-actions{display:flex;flex-wrap:wrap;gap:8px}.shipping-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--border-subtle);border-radius:9px;overflow:hidden}.shipping-metrics>div{display:grid;gap:4px;padding:12px;border-right:1px solid var(--border-subtle)}.shipping-metrics>div:last-child{border-right:0}.shipping-metrics span{color:var(--text-tertiary);font-size:.67rem}.shipping-metrics strong{font-size:.76rem}.shipping-result{margin:0}.shipping-warnings{margin:0;padding-left:18px;color:var(--warning);font-size:.72rem}.relationship-note{display:flex;align-items:flex-start;gap:8px;margin:0;padding:10px 12px;border-radius:8px;background:var(--brand-blue-soft);color:var(--text-secondary);font-size:.72rem;line-height:1.45}.relationship-note svg{flex:0 0 auto;color:var(--brand-blue)}.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.semantic-card{display:grid;gap:14px;padding:20px}.semantic-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.semantic-icon{display:grid;width:42px;height:42px;flex:0 0 auto;place-items:center;border-radius:10px;background:var(--brand-blue-soft);color:var(--brand-blue)}.semantic-notice{display:flex;align-items:flex-start;gap:8px;padding:11px 12px;border:1px solid #f5c26b;border-radius:8px;background:#fff9ed;color:#805100;font-size:.74rem}.semantic-notice svg{flex:0 0 auto}.semantic-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--border-subtle);border-radius:9px;overflow:hidden}.semantic-metrics>div{display:grid;gap:4px;padding:12px;border-right:1px solid var(--border-subtle)}.semantic-metrics>div:last-child{border-right:0}.semantic-metrics span{color:var(--text-tertiary);font-size:.67rem}.semantic-metrics strong{font-size:.82rem}
.workspace-grid{display:grid;grid-template-columns:minmax(420px,1.2fr) minmax(320px,.8fr);gap:14px}.card-header>div h2{margin-top:3px}.eyebrow{color:var(--brand-blue-strong);font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.credential-form{display:grid;gap:14px;padding:20px}.credential-form label{display:grid;gap:6px;color:var(--text-secondary);font-size:.75rem;font-weight:600}.credential-form input{width:100%;min-height:42px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;outline:none;color:var(--text-primary)}.credential-form input:focus{border-color:var(--brand-blue);box-shadow:0 0 0 3px var(--brand-blue-soft)}.password-field{position:relative}.password-field input{padding-right:44px}.password-field button{position:absolute;top:50%;right:7px;display:grid;width:32px;height:32px;place-items:center;transform:translateY(-50%);border:0;background:transparent;color:var(--text-secondary);cursor:pointer}.privacy-note{display:flex;align-items:flex-start;gap:7px;margin:0;color:var(--text-tertiary);font-size:.72rem;line-height:1.45}.privacy-note svg{flex:0 0 auto;margin-top:1px}.access-actions{display:flex;flex-wrap:wrap;gap:8px}.test-result{display:flex;align-items:flex-start;gap:8px;margin:0 20px 20px;padding:11px 12px;border-radius:8px;font-size:.76rem;line-height:1.45}.test-result svg{flex:0 0 auto}.test-result strong{display:block}.test-result ul{margin:6px 0 0;padding-left:18px}.test-result.success{background:#ecf9f0;color:#147a38}.test-result.partial{background:#fff8e8;color:#8a5700}.test-result.error{background:#fff1f0;color:#b42318}
.environment-list{display:grid;grid-template-columns:1fr 1fr}.environment-list>div{display:grid;gap:5px;padding:18px;border-top:1px solid var(--border-subtle);border-right:1px solid var(--border-subtle)}.environment-list>div:nth-child(even){border-right:0}.environment-list span{color:var(--text-tertiary);font-size:.7rem}.environment-list strong{font-size:.8rem}.safe-value{display:flex;align-items:center;gap:5px;color:#15803d}.paused-value{color:var(--warning)}.security-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.security-grid article{padding:18px}.security-grid h2,.security-grid p{margin:0}.security-grid h2{margin-top:12px;font-size:.95rem}.security-grid p{margin-top:5px;color:var(--text-secondary);font-size:.8125rem}.security-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:8px;background:var(--brand-blue-soft);color:var(--brand-blue)}
.catalog-header{align-items:flex-end}.catalog-header p,.sync-card .card-header p{margin:5px 0 0;color:var(--text-secondary);font-size:.76rem}.catalog-metrics{display:flex;gap:8px}.catalog-metrics>div{display:grid;min-width:80px;padding:8px 12px;border:1px solid var(--border-subtle);border-radius:8px;text-align:center}.catalog-metrics strong{color:var(--brand-blue-strong);font-size:1rem}.catalog-metrics span{color:var(--text-tertiary);font-size:.65rem}.catalog-table-wrap{overflow-x:auto}.catalog-table{width:100%;border-collapse:collapse;font-size:.75rem}.catalog-table th,.catalog-table td{padding:11px 16px;border-top:1px solid var(--border-subtle);text-align:left}.catalog-table th{color:var(--text-tertiary);font-size:.66rem;letter-spacing:.03em;text-transform:uppercase}.catalog-table td strong,.catalog-table td code{display:block}.catalog-table td code{margin-top:2px;color:var(--text-tertiary);font-size:.66rem}.sync-card .catalog-table td:nth-child(6){max-width:460px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.query-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:.68rem;font-weight:650}.query-status.confirmed{background:#eaf8ee;color:#157a38}.query-status.pending{background:#fff7e8;color:#a15c00}.api-warning{display:flex;align-items:flex-start;gap:9px;padding:12px 14px;border:1px solid #f5c26b;border-radius:9px;background:#fff9ed;color:#805100;font-size:.78rem}.api-warning svg{flex:0 0 auto}.api-warning code{padding:1px 4px;border-radius:4px;background:#ffefcc}.sync-card>.api-warning{margin:12px 16px}.limit-warning{color:#a15c00;font-weight:700}.delta-changed{color:#157a38;font-weight:700}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.workspace-grid,.security-grid{grid-template-columns:1fr}.integration-card{grid-template-columns:100px 1fr}.safety-seal{grid-column:1/-1;justify-self:start}.shipping-metrics,.semantic-metrics{grid-template-columns:1fr 1fr}.shipping-metrics>div:nth-child(2),.semantic-metrics>div:nth-child(2){border-right:0}}@media(max-width:560px){.integration-card,.environment-list{grid-template-columns:1fr}.environment-list>div{border-right:0}.catalog-header,.shipping-header,.semantic-header{align-items:flex-start;flex-direction:column}.shipping-metrics,.semantic-metrics{grid-template-columns:1fr}.shipping-metrics>div,.semantic-metrics>div{border-right:0}.shipping-actions .button{width:100%}.test-button{width:100%}.page-heading{align-items:flex-start;flex-direction:column}}
</style>
