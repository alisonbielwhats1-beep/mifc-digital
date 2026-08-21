<script setup lang="ts">
import { CheckCircle2, AlertCircle } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const { toastMessage, saveStatus } = storeToRefs(ui);
</script>

<template>
  <Transition name="toast">
    <div v-if="toastMessage" class="toast-message" :class="{ error: saveStatus === 'error' }" role="status" aria-live="polite">
      <AlertCircle v-if="saveStatus === 'error'" :size="18" aria-hidden="true" />
      <CheckCircle2 v-else :size="18" aria-hidden="true" />
      <span>{{ toastMessage }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast-message {
  position: fixed;
  z-index: 120;
  right: 22px;
  bottom: 22px;
  display: flex;
  max-width: min(420px, calc(100vw - 28px));
  min-height: 48px;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  border: 1px solid #bfe4cc;
  border-radius: var(--radius-md);
  background: #f3fbf6;
  box-shadow: var(--shadow-float);
  color: var(--success);
  font-size: 0.875rem;
  font-weight: 600;
}

.toast-message.error {
  border-color: #f1beb9;
  background: var(--danger-soft);
  color: var(--danger);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--transition-standard), transform var(--transition-standard);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
