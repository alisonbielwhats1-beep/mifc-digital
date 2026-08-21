<script setup lang="ts">
import { ChevronLeft, ChevronRight, Database, LoaderCircle, Search, X } from "@lucide/vue";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

interface SyncedTable {
  queryId: string;
  powerBiObject: string;
  rowCount: number;
  columns: string[];
  syncedAt: string;
  maxRows: number;
  limitReached: boolean;
}
interface TableDataResponse {
  queryId: string;
  powerBiObject: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

const props = defineProps<{ table: SyncedTable }>();
const emit = defineEmits<{ close: [] }>();
const search = ref("");
const page = ref(1);
const loading = ref(true);
const error = ref("");
const data = ref<TableDataResponse | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

async function loadRows(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: "50" });
    if (search.value.trim()) params.set("search", search.value.trim());
    const response = await fetch(`/api/oracle/tables/${encodeURIComponent(props.table.queryId)}/rows?${params.toString()}`, { cache: "no-store" });
    const body = await response.json() as TableDataResponse & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "Não foi possível ler a tabela.");
    data.value = body;
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : "Não foi possível ler a tabela.";
  } finally {
    loading.value = false;
  }
}

function queueSearch(): void {
  page.value = 1;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void loadRows(), 260);
}

function goToPage(nextPage: number): void {
  const maxPage = data.value?.totalPages ?? 1;
  page.value = Math.min(Math.max(nextPage, 1), maxPage);
  void loadRows();
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

watch(() => props.table.queryId, () => {
  search.value = "";
  page.value = 1;
  void loadRows();
});
onMounted(() => void loadRows());
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer); });
</script>

<template>
  <div class="table-viewer-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="table-viewer-dialog" role="dialog" aria-modal="true" :aria-label="`Dados da tabela ${table.powerBiObject}`">
      <header class="table-viewer-header">
        <div class="table-viewer-title"><span class="table-viewer-icon"><Database :size="18" /></span><div><span class="eyebrow">Dados conectados · somente leitura</span><h2>{{ table.powerBiObject }}</h2><code>{{ table.queryId }}</code></div></div>
        <button class="close-viewer" type="button" aria-label="Fechar visualização da tabela" @click="$emit('close')"><X :size="20" /></button>
      </header>
      <div class="table-viewer-toolbar">
        <label class="table-search"><Search :size="16" /><input v-model="search" type="search" placeholder="Filtrar linhas por qualquer coluna..." aria-label="Filtrar linhas" @input="queueSearch" /></label>
        <div class="table-viewer-meta"><span>{{ (data?.totalRows ?? table.rowCount).toLocaleString('pt-BR') }} linhas</span><span>{{ data?.columns.length ?? table.columns.length }} colunas</span><span v-if="table.limitReached" class="limit-note">Limite de leitura atingido</span></div>
      </div>
      <div v-if="error" class="viewer-error" role="alert">{{ error }}</div>
      <div v-else-if="loading" class="viewer-loading"><LoaderCircle class="spinning" :size="22" /> Carregando dados da tabela...</div>
      <div v-else-if="!data?.rows.length" class="viewer-empty"><Database :size="24" /><strong>Nenhuma linha encontrada</strong><span>{{ search ? 'Tente outro termo de busca.' : 'A tabela foi carregada sem linhas disponíveis.' }}</span></div>
      <div v-else class="viewer-table-wrap">
        <table class="viewer-table"><thead><tr><th v-for="column in data.columns" :key="column">{{ column }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in data.rows" :key="`${rowIndex}-${data.page}`"><td v-for="column in data.columns" :key="column" :title="formatCell(row[column])">{{ formatCell(row[column]) }}</td></tr></tbody></table>
      </div>
      <footer class="table-viewer-footer"><span v-if="data">Página {{ data.page }} de {{ data.totalPages.toLocaleString('pt-BR') }}</span><div><button class="page-button" type="button" :disabled="loading || page <= 1" aria-label="Página anterior" @click="goToPage(page - 1)"><ChevronLeft :size="16" /></button><button class="page-button" type="button" :disabled="loading || page >= (data?.totalPages ?? 1)" aria-label="Próxima página" @click="goToPage(page + 1)"><ChevronRight :size="16" /></button></div></footer>
    </section>
  </div>
</template>

<style scoped>
.table-viewer-backdrop{position:fixed;z-index:160;inset:0;display:grid;place-items:center;padding:28px;background:rgba(12,27,47,.48)}.table-viewer-dialog{display:grid;width:min(1180px,96vw);max-height:min(820px,92vh);grid-template-rows:auto auto 1fr auto;overflow:hidden;border:1px solid #d6e0ea;border-radius:12px;background:#fff;box-shadow:0 28px 90px rgba(11,32,57,.3)}.table-viewer-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:18px 20px;border-bottom:1px solid var(--border-subtle)}.table-viewer-title{display:flex;align-items:flex-start;gap:11px}.table-viewer-icon{display:grid;width:36px;height:36px;place-items:center;border-radius:9px;background:#e9f3ff;color:#2467a7}.table-viewer-title h2{margin:3px 0 1px;font-size:16px}.table-viewer-title code{color:#708197;font-size:9px}.close-viewer{display:grid;width:34px;height:34px;place-items:center;border:0;border-radius:7px;background:transparent;color:var(--text-secondary);cursor:pointer}.close-viewer:hover{background:#f1f5f9;color:var(--text-primary)}.table-viewer-toolbar{display:flex;align-items:center;gap:14px;padding:13px 20px;border-bottom:1px solid var(--border-subtle);background:#fbfcfe}.table-search{display:flex;min-width:280px;flex:1;align-items:center;gap:8px;padding:0 11px;border:1px solid var(--border-subtle);border-radius:7px;background:#fff;color:var(--text-tertiary)}.table-search:focus-within{border-color:var(--brand-blue);box-shadow:0 0 0 3px var(--focus-ring)}.table-search input{width:100%;height:36px;border:0;outline:0;font:inherit;font-size:11px}.table-viewer-meta{display:flex;align-items:center;gap:10px;color:var(--text-secondary);font-size:10px;white-space:nowrap}.limit-note{color:#9a5a00;font-weight:700}.viewer-table-wrap{overflow:auto}.viewer-table{min-width:100%;border-collapse:collapse;font-size:10px}.viewer-table th,.viewer-table td{max-width:260px;padding:10px 12px;border-bottom:1px solid #edf1f5;text-align:left;vertical-align:top}.viewer-table th{position:sticky;top:0;z-index:1;background:#f3f7fb;color:#47617d;font-size:9px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}.viewer-table td{overflow:hidden;color:#24384c;text-overflow:ellipsis;white-space:nowrap}.viewer-table tbody tr:hover{background:#f8fbff}.viewer-loading,.viewer-empty,.viewer-error{display:flex;min-height:230px;align-items:center;justify-content:center;gap:9px;padding:30px;color:var(--text-secondary);font-size:12px}.viewer-empty{flex-direction:column}.viewer-empty strong{color:var(--text-primary)}.viewer-empty span{font-size:10px}.viewer-error{color:#a42620}.table-viewer-footer{display:flex;align-items:center;justify-content:space-between;padding:11px 20px;border-top:1px solid var(--border-subtle);color:var(--text-tertiary);font-size:10px}.table-viewer-footer>div{display:flex;gap:5px}.page-button{display:grid;width:30px;height:30px;place-items:center;border:1px solid var(--border-subtle);border-radius:6px;background:#fff;color:var(--text-secondary);cursor:pointer}.page-button:hover:not(:disabled){border-color:#9bb8d5;color:var(--brand-blue)}.page-button:disabled{cursor:not-allowed;opacity:.4}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.table-viewer-backdrop{padding:10px}.table-viewer-toolbar{align-items:stretch;flex-direction:column}.table-search{min-width:0}.table-viewer-meta{flex-wrap:wrap}.table-viewer-header,.table-viewer-footer{padding-left:14px;padding-right:14px}}
</style>
