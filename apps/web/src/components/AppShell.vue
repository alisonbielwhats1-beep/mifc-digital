<script setup lang="ts">
import { storeToRefs } from "pinia";
import SideNav from "@/components/SideNav.vue";
import ToastRegion from "@/components/ToastRegion.vue";
import TopBar from "@/components/TopBar.vue";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const { sidebarCollapsed } = storeToRefs(ui);
</script>

<template>
  <div class="app-shell" :class="{ sidebarCollapsed }">
    <TopBar />
    <SideNav />
    <main id="main-content" class="main-content" tabindex="-1">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <ToastRegion />
  </div>
</template>

<style scoped>
.main-content {
  min-height: 100vh;
  margin-left: var(--sidebar-width);
  padding-top: var(--header-height);
  background: var(--surface-page);
  transition: margin-left var(--transition-standard);
}

.sidebarCollapsed .main-content {
  margin-left: var(--sidebar-collapsed-width);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.page-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .main-content,
  .sidebarCollapsed .main-content {
    margin-left: 0;
    padding-top: 64px;
  }
}
</style>
