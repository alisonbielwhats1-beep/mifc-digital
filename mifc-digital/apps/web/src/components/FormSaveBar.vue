<script setup lang="ts">
import { Check, Save } from "@lucide/vue";

defineProps<{
  dirty: boolean;
  saving: boolean;
  savedAt?: string;
}>();

defineEmits<{ save: [] }>();

function formatSavedAt(value?: string): string {
  if (!value) return "Ainda não salvo";
  return `Salvo em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))}`;
}
</script>

<template>
  <div class="save-cluster" aria-live="polite">
    <span class="save-state" :class="{ dirty }">
      <span class="save-dot"></span>
      {{ dirty ? "Alterações não salvas" : formatSavedAt(savedAt) }}
    </span>
    <button class="button button-primary" type="button" :disabled="saving || !dirty" @click="$emit('save')">
      <Save v-if="dirty" :size="17" />
      <Check v-else :size="17" />
      {{ saving ? "Salvando..." : dirty ? "Salvar revisão" : "Salvo" }}
    </button>
  </div>
</template>

<style scoped>
.save-cluster { display: flex; align-items: center; gap: 12px; }
.save-state { display: inline-flex; align-items: center; gap: 7px; color: var(--text-tertiary); font-size: .75rem; white-space: nowrap; }
.save-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); }
.save-state.dirty { color: #8b5b00; }
.save-state.dirty .save-dot { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-soft); }
@media (max-width: 720px) { .save-cluster { width: 100%; justify-content: space-between; } .save-state { white-space: normal; } }
</style>
