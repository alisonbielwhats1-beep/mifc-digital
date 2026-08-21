<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import StatePanel from "@/components/StatePanel.vue";

const route = useRoute();
const title = computed(() => String(route.meta.title ?? "Módulo"));
const description = computed(() => String(route.meta.description ?? "Este módulo será ativado na próxima etapa."));
</script>

<template>
  <div class="page">
    <div class="page-heading"><div><h1>{{ title }}</h1><p>{{ description }}</p></div></div>
    <StatePanel state="empty" :title="`${title} preparado`" :message="description" />
  </div>
</template>
