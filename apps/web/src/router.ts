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

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/overview" },
  { path: "/overview", name: "overview", component: OverviewView, meta: { title: "Visão geral" } },
  { path: "/dashboard", name: "dashboard", component: ModulePlaceholderView, meta: { title: "Dashboard", description: "Indicadores consolidados serão ativados após a validação das regras." } },
  { path: "/mifc/layout", name: "layout", component: MifcLayoutView, meta: { title: "Layout" } },
  { path: "/mifc/volume", name: "volume", component: VolumePreviewView, meta: { title: "Volume" } },
  { path: "/mifc/logistics", name: "logistics", component: LogisticsView, meta: { title: "Logística" } },
  { path: "/mifc/buffers", name: "buffers", component: BuffersView, meta: { title: "Buffer e Estoque" } },
  { path: "/mifc/capacity", name: "capacity", component: CapacityPreviewView, meta: { title: "Capacidade" } },
  { path: "/mifc/analysis", name: "analysis", component: CalculationStatusView, meta: { title: "Análises" } },
  { path: "/mifc/reports", name: "reports", component: ModulePlaceholderView, meta: { title: "Relatórios", description: "Exportações serão habilitadas após a validação dos cálculos." } },
  { path: "/integrations", name: "integrations", component: IntegrationsView, meta: { title: "Integrações" } },
  { path: "/products", name: "products", component: ModulePlaceholderView, meta: { title: "Produtos", description: "Cadastros de clientes, produtos e veículos pertencem ao banco da aplicação." } },
  { path: "/processes", name: "processes", component: ModulePlaceholderView, meta: { title: "Processos", description: "Cadastros de processos e máquinas serão mantidos por planta." } },
  { path: "/resources", name: "resources", component: ModulePlaceholderView, meta: { title: "Recursos", description: "Recursos produtivos serão associados aos processos e revisões." } },
  { path: "/master-data", name: "master-data", component: ModulePlaceholderView, meta: { title: "Dados mestre", description: "Parâmetros estáveis terão unidade, origem e histórico." } },
  { path: "/settings", name: "settings", component: ModulePlaceholderView, meta: { title: "Configurações", description: "Permissões, auditoria e preferências ficarão nesta área." } },
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
