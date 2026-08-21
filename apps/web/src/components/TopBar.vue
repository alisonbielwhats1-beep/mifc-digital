<script setup lang="ts">
import { Bell, ChevronDown, CircleHelp, Menu, Search } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { useContextStore } from "@/stores/context";
import { useUiStore } from "@/stores/ui";

const context = useContextStore();
const ui = useUiStore();
const { selectedPlantId, selectedScenarioId, selectedRevisionId } = storeToRefs(context);
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
          <select aria-label="Ano" :value="context.selectedScenario?.year">
            <option :value="context.selectedScenario?.year">{{ context.selectedScenario?.year }}</option>
          </select>
          <ChevronDown :size="14" aria-hidden="true" />
        </span>
      </label>

      <label class="context-field">
        <span>Cenário</span>
        <span class="select-wrap">
          <select v-model="selectedScenarioId" aria-label="Cenário">
            <option v-for="scenario in context.scenarios" :key="scenario.id" :value="scenario.id">{{ scenario.name }}</option>
          </select>
          <ChevronDown :size="14" aria-hidden="true" />
        </span>
      </label>

      <label class="context-field revision-field">
        <span>Revisão</span>
        <span class="select-wrap">
          <select v-model="selectedRevisionId" aria-label="Revisão">
            <option v-for="revision in context.revisions" :key="revision.id" :value="revision.id">{{ revision.label }} (Rascunho)</option>
          </select>
          <i aria-label="Revisão em rascunho"></i>
          <ChevronDown :size="14" aria-hidden="true" />
        </span>
      </label>
    </div>

    <div class="topbar-tools">
      <label class="search-box">
        <Search :size="17" aria-hidden="true" />
        <span class="sr-only">Buscar</span>
        <input type="search" placeholder="Buscar no MIFC..." />
        <kbd>Ctrl K</kbd>
      </label>
      <button class="icon-button" type="button" aria-label="Ajuda"><CircleHelp :size="20" aria-hidden="true" /></button>
      <button class="icon-button" type="button" aria-label="Notificações"><Bell :size="20" aria-hidden="true" /></button>
      <button class="avatar-button" type="button" aria-label="Abrir perfil de MB">MB</button>
    </div>
  </header>
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
