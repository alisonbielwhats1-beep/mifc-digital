import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { assertSafeOracleConfig, getOracleConfig } from "./config.js";
import { executeAllowlistedSelect, testOracleConnection } from "./oracle/read-only-client.js";
import { loadQueryCatalog } from "./oracle/query-catalog.js";
import { getCachedProductCatalog, getTableSyncStatus, startAutomaticRefresh, syncApprovedTables } from "./oracle/table-sync.js";
import { getCachedLayoutMeasures } from "./oracle/layout-measures.js";
import {
  getShippingScheduleStatus,
  importShippingScheduleUpload,
  MAX_SHIPPING_SCHEDULE_BYTES,
  refreshShippingScheduleFromNetwork,
} from "./imports/shipping-schedule.js";

const MAX_BODY_BYTES = 16 * 1024;
const IMPORT_RATE_WINDOW_MS = 60_000;
const MAX_IMPORT_REQUESTS_PER_WINDOW = 12;
const importRequestTimes: number[] = [];

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) throw new Error("Corpo da requisição excede o limite permitido.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON inválido.");
  return value as Record<string, unknown>;
}

async function readBinaryBody(request: IncomingMessage, maximumBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maximumBytes) throw new Error("Arquivo excede o limite de 10 MB.");
    chunks.push(buffer);
  }
  if (!chunks.length) throw new Error("Selecione um arquivo .xlsx para importar.");
  return Buffer.concat(chunks);
}

function decodedHeader(request: IncomingMessage, name: string): string {
  const raw = request.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Cabeçalho ${name} inválido.`);
  }
}

function assertAllowedLocalOrigin(request: IncomingMessage): void {
  const origin = request.headers.origin;
  if (!origin) return;
  let hostname = "";
  try {
    hostname = new URL(origin).hostname.toLocaleLowerCase("pt-BR");
  } catch {
    throw new Error("Origem da requisição inválida.");
  }
  if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(hostname)) {
    throw new Error("Origem não permitida para importação local.");
  }
}

function assertImportRateLimit(): void {
  const now = Date.now();
  while (importRequestTimes.length && importRequestTimes[0] <= now - IMPORT_RATE_WINDOW_MS) importRequestTimes.shift();
  if (importRequestTimes.length >= MAX_IMPORT_REQUESTS_PER_WINDOW) {
    throw new Error("Muitas tentativas de importação. Aguarde um minuto e tente novamente.");
  }
  importRequestTimes.push(now);
}

function assertWorkbookContentType(request: IncomingMessage): void {
  const contentType = String(request.headers["content-type"] ?? "").split(";", 1)[0].trim().toLocaleLowerCase("pt-BR");
  const allowed = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ];
  if (!allowed.includes(contentType)) throw new Error("Tipo de arquivo inválido. Selecione uma planilha .xlsx.");
}

function publicCatalogEntry(entry: Awaited<ReturnType<typeof loadQueryCatalog>>[number]) {
  return {
    id: entry.id,
    powerBiObject: entry.powerBiObject,
    queryMode: entry.queryMode,
    status: entry.status,
    enabled: entry.enabled,
    usedBy: entry.usedBy,
    maxRows: entry.maxRows,
    timeoutSeconds: entry.timeoutSeconds,
    refreshSeconds: entry.refreshSeconds,
  };
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const config = getOracleConfig();
  assertSafeOracleConfig(config);
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  if (method === "GET" && (url.pathname === "/api/health" || url.pathname === "/api/oracle/status")) {
    const catalog = await loadQueryCatalog();
    sendJson(response, 200, {
      oracle: {
        host: config.host,
        port: config.port,
        serviceName: config.serviceName,
        readOnly: config.readOnly,
        liveReadsEnabled: config.liveReadsEnabled,
        credentialsConfigured: Boolean(config.user && config.password),
      },
      catalog: {
        total: catalog.length,
        enabled: catalog.filter((entry) => entry.enabled).length,
        pending: catalog.filter((entry) => !entry.enabled).length,
      },
      connectionTested: false,
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/oracle/catalog") {
    const catalog = await loadQueryCatalog();
    sendJson(response, 200, { queries: catalog.map(publicCatalogEntry) });
    return;
  }

  if (method === "GET" && url.pathname === "/api/oracle/sync-status") {
    sendJson(response, 200, getTableSyncStatus());
    return;
  }

  if (method === "GET" && url.pathname === "/api/imports/shipping-schedule/status") {
    sendJson(response, 200, getShippingScheduleStatus());
    return;
  }

  if (method === "POST" && url.pathname === "/api/imports/shipping-schedule/network") {
    assertAllowedLocalOrigin(request);
    assertImportRateLimit();
    sendJson(response, 200, await refreshShippingScheduleFromNetwork());
    return;
  }

  if (method === "POST" && url.pathname === "/api/imports/shipping-schedule/upload") {
    assertAllowedLocalOrigin(request);
    assertImportRateLimit();
    assertWorkbookContentType(request);
    const file = await readBinaryBody(request, MAX_SHIPPING_SCHEDULE_BYTES);
    const fileName = decodedHeader(request, "x-file-name") || "Programacao_embarque.xlsx";
    const modifiedHeader = decodedHeader(request, "x-file-last-modified");
    const fileModifiedAt = modifiedHeader && !Number.isNaN(Date.parse(modifiedHeader)) ? new Date(modifiedHeader).toISOString() : null;
    sendJson(response, 200, importShippingScheduleUpload(file, fileName, fileModifiedAt));
    return;
  }

  if (method === "GET" && url.pathname === "/api/layout/measures") {
    const contextDate = url.searchParams.get("date") ?? undefined;
    if (contextDate && !/^\d{4}-\d{2}-\d{2}$/.test(contextDate)) throw new Error("Data de contexto inválida; use AAAA-MM-DD.");
    sendJson(response, 200, getCachedLayoutMeasures(contextDate));
    return;
  }

  if (method === "GET" && url.pathname === "/api/master-data/products") {
    sendJson(response, 200, getCachedProductCatalog());
    return;
  }

  if (method === "POST" && url.pathname === "/api/oracle/test-connection") {
    const body = await readJsonBody(request);
    const user = typeof body.user === "string" ? body.user : "";
    const password = typeof body.password === "string" ? body.password : "";
    await testOracleConnection({ user, password });
    sendJson(response, 200, { ok: true, message: "Conexão Oracle validada em modo somente leitura. Nenhuma consulta foi executada." });
    return;
  }

  if (method === "POST" && url.pathname === "/api/oracle/sync-approved") {
    const body = await readJsonBody(request);
    const user = typeof body.user === "string" ? body.user : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await syncApprovedTables({ user, password });
    const automaticRefresh = result.tables.length > 0 ? startAutomaticRefresh() : getTableSyncStatus().automaticRefresh;
    sendJson(response, 200, { ...result, automaticRefresh });
    return;
  }

  const executionMatch = method === "POST" && url.pathname.match(/^\/api\/oracle\/queries\/([a-z0-9-]+)\/execute$/);
  if (executionMatch) {
    const body = await readJsonBody(request);
    const binds = body.binds && typeof body.binds === "object" && !Array.isArray(body.binds)
      ? body.binds as Record<string, unknown>
      : {};
    const result = await executeAllowlistedSelect(executionMatch[1], binds);
    sendJson(response, 200, result);
    return;
  }

  sendJson(response, 404, { error: "Rota não encontrada." });
}

const config = getOracleConfig();
assertSafeOracleConfig(config);
const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  const startedAt = performance.now();
  try {
    await route(request, response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    const isInputError = /obrigat|inválid|limite|allowlist|permitid|proibid|desabilitad|fingerprint|não encontrada|arquivo|xlsx|planilha|aba|coluna|estrutura|muitas tentativas/i.test(message);
    sendJson(response, isInputError ? 400 : 502, { error: message, requestId });
  } finally {
    const method = request.method ?? "GET";
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    console.log(`${requestId} ${method} ${pathname} ${response.statusCode} ${Math.round(performance.now() - startedAt)}ms`);
  }
});

server.listen(config.apiPort, "127.0.0.1", () => {
  console.log(`MIFC API local em http://127.0.0.1:${config.apiPort}`);
  console.log("Oracle somente leitura ativo; nenhuma conexão é aberta automaticamente.");
  void refreshShippingScheduleFromNetwork()
    .then((result) => console.log(`Programação de embarque carregada da rede: ${result.rowCount} linhas.`))
    .catch((error: unknown) => console.warn(`Programação de embarque indisponível na rede; use o anexo no app. ${error instanceof Error ? error.message : ""}`));
});
