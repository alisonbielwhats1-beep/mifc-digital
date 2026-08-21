<script setup lang="ts">
import { AlertCircle, Inbox, LoaderCircle, RotateCw } from "@lucide/vue";

defineProps<{
  state: "loading" | "empty" | "error";
  title?: string;
  message?: string;
}>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <section class="state-panel" :aria-busy="state === 'loading'" :role="state === 'error' ? 'alert' : 'status'">
    <LoaderCircle v-if="state === 'loading'" class="state-icon spin" :size="28" aria-hidden="true" />
    <Inbox v-else-if="state === 'empty'" class="state-icon" :size="28" aria-hidden="true" />
    <AlertCircle v-else class="state-icon error" :size="28" aria-hidden="true" />
    <h2>{{ title ?? (state === 'loading' ? 'Carregando dados' : state === 'empty' ? 'Nada por aqui ainda' : 'Não foi possível carregar') }}</h2>
    <p>{{ message ?? (state === 'loading' ? 'Aguarde enquanto preparamos esta área.' : state === 'empty' ? 'Crie o primeiro registro para começar.' : 'Verifique a origem dos dados e tente novamente.') }}</p>
    <button v-if="state === 'error'" class="button button-secondary" type="button" @click="$emit('retry')">
      <RotateCw :size="16" aria-hidden="true" />
      Tentar novamente
    </button>
  </section>
</template>

<style scoped>
.state-panel {
  display: grid;
  min-height: 280px;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 32px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  text-align: center;
}

.state-icon {
  color: var(--brand-blue);
}

.state-icon.error {
  color: var(--danger);
}

h2,
p {
  margin: 0;
}

h2 {
  margin-top: 4px;
  font-size: 1rem;
}

p {
  max-width: 420px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.button {
  margin-top: 10px;
}

.spin {
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
