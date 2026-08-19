<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AlertTriangle, CheckCircle2, Database, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Network, RefreshCw, ShieldCheck } from "@lucide/vue";
import DataOriginBadge from "@/components/DataOriginBadge.vue";

interface OracleStatus {
  oracle: { host: string; port: number; serviceName: string; readOnly: boolean; liveReadsEnabled: boolean; credentialsConfigured: boolean };
  catalog: { total: number; enabled: number; pending: number };
}
interface CatalogQuery {
  id: string; powerBiObject: string; queryMode: "embedded-sql" | "navigation-m"; status: string; enabled: boolean; usedBy: string[];
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
const confirmedQueries = computed(() => queries.value.filter((query) => query.enabled));
const pendingQueries = computed(() => queries.value.filter((query) => !query.enabled));

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Não foi possível concluir a operação.");
  return body;
}

async function loadConfiguration(): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const [statusResponse, catalogResponse] = await Promise.all([
      fetch("/api/oracle/status", { cache: "no-store" }),
      fetch("/api/oracle/catalog", { cache: "no-store" }),
    ]);
    status.value = await readJson<OracleStatus>(statusResponse);
    const catalog = await readJson<{ queries: CatalogQuery[] }>(catalogResponse);
    queries.value = catalog.queries;
  } catch (error: unknown) {
    loadError.value = error instanceof Error ? error.message : "API local indisponível.";
  } finally {
    loading.value = false;
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

onMounted(loadConfiguration);
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><h1>Integrações</h1><p>Conexão Oracle preparada com proteção de leitura e catálogo fechado.</p></div>
      <button class="button button-secondary" type="button" :disabled="loading" @click="loadConfiguration"><RefreshCw :size="16" :class="{ spinning: loading }" /> Atualizar estado</button>
    </div>
    <div class="context-banner"><span><strong>Nenhuma consulta é executada automaticamente.</strong> O teste apenas abre e fecha a conexão; a senha não é salva pela aplicação.</span><DataOriginBadge origin="ORACLE_MES" /></div>
    <div v-if="loadError" class="api-warning" role="alert"><AlertTriangle :size="18" /><span><strong>API local indisponível.</strong> Reinicie a aplicação com <code>npm run dev</code>. {{ loadError }}</span></div>

    <section class="integration-card card">
      <div class="oracle-mark"><Database :size="30" aria-hidden="true" /><span>ORACLE<br /><strong>MES</strong></span></div>
      <div class="integration-title"><div><h2>Oracle MES</h2><span class="status-pill" :class="status?.oracle.liveReadsEnabled ? '' : 'warning'">{{ status?.oracle.liveReadsEnabled ? 'Leituras liberadas' : 'Leituras pausadas' }}</span></div><p>Produção, estoque, paradas, WIP e segregação — somente por consultas do PBIP aprovado.</p></div>
      <div class="safety-seal"><ShieldCheck :size="18" /><span>Proteção</span><strong>READ ONLY</strong></div>
    </section>

    <section class="workspace-grid">
      <article class="card credential-card">
        <header class="card-header"><div><span class="eyebrow">Teste de acesso</span><h2>Entrar com usuário e senha</h2></div><KeyRound :size="21" aria-hidden="true" /></header>
        <form class="credential-form" autocomplete="off" @submit.prevent="testConnection">
          <label><span>Usuário Oracle</span><input v-model.trim="user" name="oracle-test-user" autocomplete="off" required placeholder="Seu usuário somente leitura" /></label>
          <label><span>Senha</span><div class="password-field"><input v-model="password" name="oracle-test-password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required placeholder="Digite somente para testar" /><button type="button" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div></label>
          <p class="privacy-note"><LockKeyhole :size="15" /> A senha é enviada apenas à API local para o teste e apagada do formulário ao terminar.</p>
          <button class="button button-primary test-button" type="submit" :disabled="testState === 'testing' || !status"><LoaderCircle v-if="testState === 'testing'" class="spinning" :size="17" /><Network v-else :size="17" />{{ testState === 'testing' ? 'Testando...' : 'Testar conexão sem consultar dados' }}</button>
        </form>
        <div v-if="testMessage" class="test-result" :class="testState" role="status"><CheckCircle2 v-if="testState === 'success'" :size="18" /><AlertTriangle v-else :size="18" /><span>{{ testMessage }}</span></div>
      </article>

      <article class="card environment-card">
        <header class="card-header"><div><span class="eyebrow">Ambiente local</span><h2>Destino configurado</h2></div></header>
        <div class="environment-list">
          <div><span>Host</span><strong>{{ status?.oracle.host ?? 'Carregando...' }}</strong></div><div><span>Porta</span><strong>{{ status?.oracle.port ?? '—' }}</strong></div>
          <div><span>Serviço</span><strong>{{ status?.oracle.serviceName ?? '—' }}</strong></div><div><span>Modo</span><strong class="safe-value"><ShieldCheck :size="15" /> Somente leitura</strong></div>
          <div><span>Credenciais no ambiente</span><strong>{{ status?.oracle.credentialsConfigured ? 'Configuradas' : 'Não armazenadas' }}</strong></div><div><span>Leituras de dados</span><strong class="paused-value">{{ status?.oracle.liveReadsEnabled ? 'Liberadas' : 'Desativadas' }}</strong></div>
        </div>
      </article>
    </section>

    <section class="security-grid">
      <article class="card"><div class="security-icon"><LockKeyhole :size="21" /></div><h2>Credenciais efêmeras</h2><p>O formulário não usa armazenamento local e limpa a senha depois de cada tentativa.</p></article>
      <article class="card"><div class="security-icon"><ShieldCheck :size="21" /></div><h2>Transação protegida</h2><p>Consultas futuras usam transação READ ONLY, sem commit e com rollback obrigatório.</p></article>
      <article class="card"><div class="security-icon"><Network :size="21" /></div><h2>SQL fechado</h2><p>O navegador envia apenas o ID da consulta; o SQL vem do PBIP e precisa manter a assinatura aprovada.</p></article>
    </section>

    <section class="card catalog-card">
      <header class="card-header catalog-header"><div><span class="eyebrow">Allowlist do Power BI</span><h2>Catálogo de consultas Oracle</h2><p>Consultas SQL localizadas no MIFC atual e objetos que ainda dependem de materialização.</p></div><div class="catalog-metrics"><div><strong>{{ confirmedQueries.length }}</strong><span>confirmadas</span></div><div><strong>{{ pendingQueries.length }}</strong><span>pendentes</span></div></div></header>
      <div class="catalog-table-wrap"><table class="catalog-table"><thead><tr><th>Objeto Power BI</th><th>Modo</th><th>Uso mapeado</th><th>Estado</th></tr></thead><tbody>
        <tr v-for="query in queries" :key="query.id"><td><strong>{{ query.powerBiObject }}</strong><code>{{ query.id }}</code></td><td>{{ query.queryMode === 'embedded-sql' ? 'SQL embutido' : 'Navegação M' }}</td><td>{{ query.usedBy.length ? query.usedBy.join(', ') : 'A validar no layout' }}</td><td><span class="query-status" :class="query.enabled ? 'confirmed' : 'pending'">{{ query.enabled ? 'Confirmada no PBIP' : 'Materialização pendente' }}</span></td></tr>
        <tr v-if="!loading && queries.length === 0"><td colspan="4">Catálogo não carregado.</td></tr>
      </tbody></table></div>
    </section>
  </div>
</template>

<style scoped>
.integration-card{display:grid;grid-template-columns:130px 1fr auto;align-items:center;gap:20px;padding:20px}.oracle-mark{display:flex;min-height:84px;align-items:center;justify-content:center;gap:10px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);color:#d13b2f;font-size:.75rem;line-height:1.2}.oracle-mark strong{color:var(--text-primary);font-size:1rem}.integration-title>div{display:flex;align-items:center;gap:10px}.integration-title h2,.integration-title p{margin:0}.integration-title h2{font-size:1.2rem}.integration-title p{margin-top:5px;color:var(--text-secondary);font-size:.8125rem}.safety-seal{display:grid;grid-template-columns:auto auto;align-items:center;gap:2px 7px;padding:10px 14px;border:1px solid #a7dfb8;border-radius:9px;background:#f0fbf3;color:#15803d;font-size:.68rem}.safety-seal svg{grid-row:1/3}.safety-seal strong{font-size:.75rem;letter-spacing:.04em}
.workspace-grid{display:grid;grid-template-columns:minmax(420px,1.2fr) minmax(320px,.8fr);gap:14px}.card-header>div h2{margin-top:3px}.eyebrow{color:var(--brand-blue-strong);font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.credential-form{display:grid;gap:14px;padding:20px}.credential-form label{display:grid;gap:6px;color:var(--text-secondary);font-size:.75rem;font-weight:600}.credential-form input{width:100%;min-height:42px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;outline:none;color:var(--text-primary)}.credential-form input:focus{border-color:var(--brand-blue);box-shadow:0 0 0 3px var(--brand-blue-soft)}.password-field{position:relative}.password-field input{padding-right:44px}.password-field button{position:absolute;top:50%;right:7px;display:grid;width:32px;height:32px;place-items:center;transform:translateY(-50%);border:0;background:transparent;color:var(--text-secondary);cursor:pointer}.privacy-note{display:flex;align-items:flex-start;gap:7px;margin:0;color:var(--text-tertiary);font-size:.72rem;line-height:1.45}.privacy-note svg{flex:0 0 auto;margin-top:1px}.test-button{justify-self:start}.test-result{display:flex;align-items:flex-start;gap:8px;margin:0 20px 20px;padding:11px 12px;border-radius:8px;font-size:.76rem;line-height:1.45}.test-result svg{flex:0 0 auto}.test-result.success{background:#ecf9f0;color:#147a38}.test-result.error{background:#fff1f0;color:#b42318}
.environment-list{display:grid;grid-template-columns:1fr 1fr}.environment-list>div{display:grid;gap:5px;padding:18px;border-top:1px solid var(--border-subtle);border-right:1px solid var(--border-subtle)}.environment-list>div:nth-child(even){border-right:0}.environment-list span{color:var(--text-tertiary);font-size:.7rem}.environment-list strong{font-size:.8rem}.safe-value{display:flex;align-items:center;gap:5px;color:#15803d}.paused-value{color:var(--warning)}.security-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.security-grid article{padding:18px}.security-grid h2,.security-grid p{margin:0}.security-grid h2{margin-top:12px;font-size:.95rem}.security-grid p{margin-top:5px;color:var(--text-secondary);font-size:.8125rem}.security-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:8px;background:var(--brand-blue-soft);color:var(--brand-blue)}
.catalog-header{align-items:flex-end}.catalog-header p{margin:5px 0 0;color:var(--text-secondary);font-size:.76rem}.catalog-metrics{display:flex;gap:8px}.catalog-metrics>div{display:grid;min-width:80px;padding:8px 12px;border:1px solid var(--border-subtle);border-radius:8px;text-align:center}.catalog-metrics strong{color:var(--brand-blue-strong);font-size:1rem}.catalog-metrics span{color:var(--text-tertiary);font-size:.65rem}.catalog-table-wrap{overflow-x:auto}.catalog-table{width:100%;border-collapse:collapse;font-size:.75rem}.catalog-table th,.catalog-table td{padding:11px 16px;border-top:1px solid var(--border-subtle);text-align:left}.catalog-table th{color:var(--text-tertiary);font-size:.66rem;letter-spacing:.03em;text-transform:uppercase}.catalog-table td strong,.catalog-table td code{display:block}.catalog-table td code{margin-top:2px;color:var(--text-tertiary);font-size:.66rem}.query-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:.68rem;font-weight:650}.query-status.confirmed{background:#eaf8ee;color:#157a38}.query-status.pending{background:#fff7e8;color:#a15c00}.api-warning{display:flex;align-items:flex-start;gap:9px;padding:12px 14px;border:1px solid #f5c26b;border-radius:9px;background:#fff9ed;color:#805100;font-size:.78rem}.api-warning svg{flex:0 0 auto}.api-warning code{padding:1px 4px;border-radius:4px;background:#ffefcc}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.workspace-grid,.security-grid{grid-template-columns:1fr}.integration-card{grid-template-columns:100px 1fr}.safety-seal{grid-column:1/-1;justify-self:start}}@media(max-width:560px){.integration-card,.environment-list{grid-template-columns:1fr}.environment-list>div{border-right:0}.catalog-header{align-items:flex-start;flex-direction:column}.test-button{width:100%}.page-heading{align-items:flex-start;flex-direction:column}}
</style>
