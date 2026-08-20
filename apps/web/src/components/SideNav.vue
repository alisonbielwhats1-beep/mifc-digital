<script setup lang="ts">
import {
  Boxes,
  ChevronDown,
  CircleGauge,
  Database,
  Factory,
  House,
  ListChecks,
  Network,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SlidersHorizontal,
  UsersRound,
  X,
} from "@lucide/vue";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useRoute } from "vue-router";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const route = useRoute();
const { sidebarCollapsed, mobileNavigationOpen } = storeToRefs(ui);

const primary = [
  { label: "Visão Geral", to: "/overview", icon: House },
  { label: "Layout", to: "/mifc/layout", icon: Network },
];

const mifc = [
  { label: "Volume", to: "/mifc/volume" },
  { label: "Logística", to: "/mifc/logistics" },
  { label: "Buffer e Estoque", to: "/mifc/buffers" },
  { label: "Capacidade", to: "/mifc/capacity" },
  { label: "Análises", to: "/mifc/analysis" },
];

const registrations = [
  { label: "Produtos", to: "/products", icon: Package },
  { label: "Processos", to: "/processes", icon: Factory },
  { label: "Máquinas & Recursos", to: "/resources", icon: UsersRound },
];

const administration = [
  { label: "Dados mestre", to: "/master-data", icon: SlidersHorizontal },
  { label: "Sistema", to: "/settings", icon: Settings },
  { label: "Diagnóstico", to: "/diagnostics", icon: CircleGauge },
];

const direct = [
  { label: "Integrações", to: "/integrations", icon: Database },
  { label: "Plano de Ações", to: "/actions", icon: ListChecks },
];

const expanded = ref({ mifc: true, registrations: false, administration: false });

function toggleSection(section: keyof typeof expanded.value) {
  if (sidebarCollapsed.value) ui.toggleSidebar();
  expanded.value[section] = !expanded.value[section];
}

function active(to: string) {
  return route.path === to;
}

function sectionActive(items: Array<{ to: string }>) {
  return items.some((item) => active(item.to));
}
</script>

<template>
  <div v-if="mobileNavigationOpen" class="nav-scrim" aria-hidden="true" @click="ui.closeMobileNavigation"></div>
  <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, mobileOpen: mobileNavigationOpen }" aria-label="Navegação principal">
    <div class="mobile-nav-heading">
      <strong>Navegação</strong>
      <button type="button" aria-label="Fechar navegação" @click="ui.closeMobileNavigation"><X :size="20" /></button>
    </div>

    <nav class="nav-content" aria-label="Navegação principal">
      <p class="nav-purpose">OPERAR</p>
      <RouterLink v-for="item in primary" :key="item.to" class="nav-link" :class="{ active: active(item.to) }" :to="item.to" :title="sidebarCollapsed ? item.label : undefined" @click="ui.closeMobileNavigation">
        <component :is="item.icon" :size="19" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>

      <p class="nav-purpose">ALIMENTAR</p>
      <div class="nav-section">
        <button type="button" class="nav-section-title" :class="{ active: mifc.some(item => active(item.to)) }" :aria-expanded="expanded.mifc" aria-label="MIFC" @click="toggleSection('mifc')">
          <Network :size="19" :stroke-width="1.8" aria-hidden="true" />
          <span>MIFC</span>
          <ChevronDown v-if="!sidebarCollapsed" class="nav-chevron" :class="{ expanded: expanded.mifc }" :size="15" aria-hidden="true" />
        </button>
        <div v-if="!sidebarCollapsed && expanded.mifc" class="subnav">
          <RouterLink v-for="item in mifc" :key="item.to" class="subnav-link" :class="{ active: active(item.to) }" :to="item.to" @click="ui.closeMobileNavigation">
            {{ item.label }}
          </RouterLink>
        </div>
      </div>

      <p class="nav-purpose">ADMINISTRAR</p>
      <div class="nav-section">
        <button type="button" class="nav-section-title" :class="{ active: sectionActive(registrations) }" :aria-expanded="expanded.registrations" aria-label="Cadastros" @click="toggleSection('registrations')">
          <Boxes :size="19" :stroke-width="1.8" aria-hidden="true" /><span>Cadastros</span><ChevronDown v-if="!sidebarCollapsed" class="nav-chevron" :class="{ expanded: expanded.registrations }" :size="15" aria-hidden="true" />
        </button>
        <div v-if="!sidebarCollapsed && expanded.registrations" class="subnav">
          <RouterLink v-for="item in registrations" :key="item.to" class="subnav-link" :class="{ active: active(item.to) }" :to="item.to" @click="ui.closeMobileNavigation">{{ item.label }}</RouterLink>
        </div>
      </div>

      <RouterLink v-for="item in direct" :key="item.to" class="nav-link" :class="{ active: active(item.to) }" :to="item.to" :title="sidebarCollapsed ? item.label : undefined" @click="ui.closeMobileNavigation">
        <component :is="item.icon" :size="19" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>

      <div class="nav-section">
        <button type="button" class="nav-section-title" :class="{ active: sectionActive(administration) }" :aria-expanded="expanded.administration" aria-label="Configurações" @click="toggleSection('administration')">
          <Settings :size="19" :stroke-width="1.8" aria-hidden="true" /><span>Configurações</span><ChevronDown v-if="!sidebarCollapsed" class="nav-chevron" :class="{ expanded: expanded.administration }" :size="15" aria-hidden="true" />
        </button>
        <div v-if="!sidebarCollapsed && expanded.administration" class="subnav">
          <RouterLink v-for="item in administration" :key="item.to" class="subnav-link" :class="{ active: active(item.to) }" :to="item.to" @click="ui.closeMobileNavigation">{{ item.label }}</RouterLink>
        </div>
      </div>
    </nav>

    <button class="collapse-button" type="button" :aria-label="sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'" @click="ui.toggleSidebar">
      <PanelLeftOpen v-if="sidebarCollapsed" :size="18" aria-hidden="true" />
      <PanelLeftClose v-else :size="18" aria-hidden="true" />
      <span>{{ sidebarCollapsed ? "Expandir" : "Recolher" }}</span>
      <ChevronDown v-if="!sidebarCollapsed" class="collapse-chevron" :size="15" aria-hidden="true" />
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  z-index: 70;
  top: var(--header-height);
  bottom: 0;
  left: 0;
  display: flex;
  width: var(--sidebar-width);
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  background: var(--surface-card);
  transition: width var(--transition-standard), transform var(--transition-standard);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.nav-content {
  display: grid;
  gap: 3px;
  overflow-y: auto;
  padding: 12px 10px;
}

.nav-purpose { margin: 9px 11px 2px; color: var(--text-tertiary); font-size: 0.58rem; font-weight: 800; letter-spacing: 0.09em; }

.nav-link,
.nav-section-title {
  position: relative;
  display: grid;
  min-height: 42px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-section-title { width: 100%; border: 0; background: transparent; text-align: left; cursor: pointer; }

.nav-link:hover,
.nav-section-title:hover {
  background: var(--surface-muted);
  color: var(--text-primary);
}

.nav-link.active,
.nav-section-title.active {
  background: var(--surface-selected);
  color: var(--brand-blue-strong);
  font-weight: 600;
}

.nav-link.active::before,
.nav-section-title.active::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: -10px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--brand-blue);
  content: "";
}

.nav-chevron {
  margin-left: auto;
  transition: transform var(--transition-fast);
}

.nav-chevron.expanded { transform: rotate(180deg); }

.subnav {
  display: grid;
  margin: 4px 0 8px 34px;
  padding-left: 12px;
  border-left: 1px solid var(--border-subtle);
}

.subnav-link {
  display: flex;
  min-height: 36px;
  align-items: center;
  padding: 0 10px;
  border-radius: 5px;
  color: var(--text-secondary);
  font-size: 0.775rem;
}

.subnav-link:hover {
  color: var(--text-primary);
}

.subnav-link.active {
  background: var(--surface-selected);
  color: var(--brand-blue-strong);
  font-weight: 600;
}

.collapse-button {
  display: grid;
  min-height: 52px;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: 9px;
  margin-top: auto;
  padding: 0 20px;
  border: 0;
  border-top: 1px solid var(--border-subtle);
  background: var(--surface-card);
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.collapse-button:hover {
  color: var(--brand-blue-strong);
}

.sidebar.collapsed .nav-link,
.sidebar.collapsed .nav-section-title,
.sidebar.collapsed .collapse-button {
  grid-template-columns: 1fr;
  justify-items: center;
  padding-inline: 0;
}

.sidebar.collapsed span,
.sidebar.collapsed .collapse-chevron,
.sidebar.collapsed .nav-purpose {
  display: none;
}

.mobile-nav-heading,
.nav-scrim {
  display: none;
}

@media (max-width: 860px) {
  .sidebar,
  .sidebar.collapsed {
    z-index: 100;
    top: 0;
    width: min(294px, 88vw);
    transform: translateX(-103%);
    box-shadow: var(--shadow-float);
  }

  .sidebar.mobileOpen {
    transform: translateX(0);
  }

  .sidebar.collapsed span,
  .sidebar.collapsed .collapse-chevron {
    display: initial;
  }

  .sidebar.collapsed .nav-link,
  .sidebar.collapsed .nav-section-title,
  .sidebar.collapsed .collapse-button {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    justify-items: initial;
    padding-inline: 11px;
  }

  .mobile-nav-heading {
    display: flex;
    min-height: 64px;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px 0 20px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .mobile-nav-heading button {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: transparent;
  }

  .nav-scrim {
    position: fixed;
    z-index: 95;
    inset: 0;
    display: block;
    background: rgba(16, 34, 62, 0.5);
  }

  .collapse-button {
    display: none;
  }
}
</style>
