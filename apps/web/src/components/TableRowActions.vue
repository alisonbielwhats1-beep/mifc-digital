<script setup lang="ts">
import { Copy, Power } from "@lucide/vue";

defineProps<{ active: boolean; label: string }>();
defineEmits<{ duplicate: []; toggle: [] }>();
</script>

<template>
  <div class="row-actions">
    <button type="button" :aria-label="`Duplicar ${label}`" title="Duplicar" @click="$emit('duplicate')"><Copy :size="15" /></button>
    <button type="button" :class="{ inactive: !active }" :aria-label="active ? `Desativar ${label}` : `Ativar ${label}`" :title="active ? 'Desativar' : 'Ativar'" @click="$emit('toggle')"><Power :size="15" /></button>
  </div>
</template>

<style scoped>
.row-actions { display: flex; justify-content: flex-end; gap: 4px; }
.row-actions button { display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid var(--border-subtle); border-radius: 6px; background: white; color: var(--text-secondary); }
.row-actions button:hover { border-color: var(--brand-blue); color: var(--brand-blue-strong); }
.row-actions button.inactive { color: var(--text-tertiary); background: var(--surface-muted); }
</style>
