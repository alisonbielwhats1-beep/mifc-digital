import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import OverviewView from "@/views/OverviewView.vue";
import VolumePreviewView from "@/views/VolumePreviewView.vue";
import CapacityPreviewView from "@/views/CapacityPreviewView.vue";
import LogisticsView from "@/views/LogisticsView.vue";
import BuffersView from "@/views/BuffersView.vue";
import CalculationStatusView from "@/views/CalculationStatusView.vue";
import IntegrationsView from "@/views/IntegrationsView.vue";
import MifcLayoutView from "@/views/MifcLayoutView.vue";
import ModulePlaceholderView from "@/views/ModulePlaceholderView.vue";
import OperationalRegistryView from "@/views/OperationalRegistryView.vue";
import ActionsView from "@/views/ActionsView.vue";
import SettingsView from "@/views/SettingsView.vue";
import DiagnosticsView from "@/views/DiagnosticsView.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/overview" },
  { path: "/overview", name: "overview", component: OverviewView, meta: { title: "Visão geral" } },
  { path: "/dashboard", redirect: "/overview" },
  { path: "/mifc/layout", name: "layout", component: MifcLayoutView, meta: { title: "Layout" } },
  { path: "/mifc/volume", name: "volume", component: VolumePreviewView, meta: { title: "Volume" } },
  { path: "/mifc/logistics", name: "logistics", component: LogisticsView, meta: { title: "Logística" } },
  { path: "/mifc/buffers", name: "buffers", component: BuffersView, meta: { title: "Buffer e Estoque" } },
  { path: "/mifc/capacity", name: "capacity", component: CapacityPreviewView, meta: { title: "Capacidade" } },
  { path: "/mifc/analysis", name: "analysis", component: CalculationStatusView, meta: { title: "Análises" } },
  { path: "/mifc/reports", name: "reports", component: ModulePlaceholderView, meta: { title: "Relatórios", description: "Exportações serão habilitadas após a validação dos cálculos." } },
  { path: "/integrations", name: "integrations", component: IntegrationsView, meta: { title: "Integrações" } },
  { path: "/products", name: "products", component: OperationalRegistryView, props: { mode: "products" }, meta: { title: "Produtos" } },
  { path: "/processes", name: "processes", component: OperationalRegistryView, props: { mode: "processes" }, meta: { title: "Processos" } },
  { path: "/resources", name: "resources", component: OperationalRegistryView, props: { mode: "resources" }, meta: { title: "Máquinas & Recursos" } },
  { path: "/actions", name: "actions", component: ActionsView, meta: { title: "Ações" } },
  { path: "/master-data", name: "master-data", component: OperationalRegistryView, props: { mode: "master" }, meta: { title: "Dados mestre" } },
  { path: "/settings", name: "settings", component: SettingsView, meta: { title: "Configurações" } },
  { path: "/diagnostics", name: "diagnostics", component: DiagnosticsView, meta: { title: "Diagnóstico" } },
  { path: "/:pathMatch(.*)*", redirect: "/overview" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? "MIFC Digital")} · MIFC Digital`;
  requestAnimationFrame(() => document.querySelector<HTMLElement>("#main-content")?.focus());
});
