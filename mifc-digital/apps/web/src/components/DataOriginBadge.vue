<script setup lang="ts">
import type { DataOrigin } from "@mifc/domain";
import { computed } from "vue";
import { getSourcePresentation } from "@/domain/source-presentation";

const props = defineProps<{ origin: DataOrigin; compact?: boolean }>();
const presentation = computed(() => getSourcePresentation(props.origin));
</script>

<template>
  <span
    class="origin-badge"
    :class="[`origin-${presentation.tone}`, { compact }]"
    :title="presentation.description"
  >
    {{ presentation.label }}
  </span>
</template>

<style scoped>
.origin-badge {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: 5px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.035em;
  text-transform: uppercase;
  white-space: nowrap;
}

.compact {
  min-height: 22px;
  padding: 2px 6px;
  font-size: 0.625rem;
}

.origin-input {
  border-color: #bdd0ff;
  background: var(--brand-blue-soft);
  color: var(--brand-blue-strong);
}

.origin-calculated {
  border-color: #d7dde5;
  background: #f2f4f7;
  color: #4b5c73;
}

.origin-mes {
  border-color: #bfe4cc;
  background: var(--success-soft);
  color: var(--success);
}

.origin-import {
  border-color: #f7d8b6;
  background: var(--warning-soft);
  color: var(--warning);
}

.origin-mixed {
  border-color: #d7d3ff;
  background: #f3f1ff;
  color: #5b4fc4;
}
</style>
