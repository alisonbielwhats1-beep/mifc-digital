<script setup lang="ts">
import { Building2, ChevronUp, Database, FileText, KanbanSquare, PackageOpen, Pause, Square, Truck } from "@lucide/vue";
import type { MifcFlowType } from "@mifc/domain";
import type { LayoutNodeType } from "@/stores/mifc-layout";

defineEmits<{ add: [type: LayoutNodeType]; flow: [type: MifcFlowType] }>();
const symbols: Array<{ type: LayoutNodeType; label: string; icon: unknown }> = [
  { type: "process", label: "Processo", icon: Square }, { type: "storage", label: "Armazenamento", icon: PackageOpen },
  { type: "stagnation", label: "Estagnação", icon: Pause }, { type: "database", label: "Base de dados", icon: Database },
  { type: "customer_supplier", label: "Cliente / fornecedor", icon: Building2 }, { type: "truck", label: "Caminhão", icon: Truck },
  { type: "kanban", label: "Kanban", icon: KanbanSquare }, { type: "information", label: "Informação", icon: FileText },
];
</script>

<template>
  <aside class="symbol-palette" aria-label="Biblioteca de símbolos MIFC">
    <header><strong>Símbolos MIFC</strong><ChevronUp :size="15" /></header>
    <div class="flow-symbols"><button type="button" @click="$emit('flow','material_push')"><span class="flow-line solid"></span><span>Fluxo de material</span></button><button type="button" @click="$emit('flow','information')"><span class="flow-line info"></span><span>Fluxo de informação</span></button><button type="button" @click="$emit('flow','electronic_information')"><span class="flow-line electronic"></span><span>Informação eletrônica</span></button></div>
    <div class="symbol-list"><button v-for="symbol in symbols" :key="symbol.type" type="button" @click="$emit('add',symbol.type)"><component :is="symbol.icon" :size="22" /><span>{{ symbol.label }}</span><small>+</small></button></div>
    <footer>Formas básicas <ChevronUp :size="13" /></footer>
  </aside>
</template>

<style scoped>
.symbol-palette{position:absolute;z-index:30;top:14px;left:14px;width:184px;overflow:hidden;border:1px solid var(--border-subtle);border-radius:9px;background:rgba(255,255,255,.97);box-shadow:0 8px 24px rgba(16,34,62,.11);backdrop-filter:blur(8px)}header,footer{display:flex;align-items:center;justify-content:space-between;padding:12px 13px;font-size:11px}header{border-bottom:1px solid var(--border-subtle)}footer{border-top:1px solid var(--border-subtle);color:var(--text-secondary)}.flow-symbols{display:grid;padding:6px 9px;border-bottom:1px solid var(--border-subtle)}button{display:grid;width:100%;grid-template-columns:38px 1fr auto;align-items:center;gap:7px;min-height:39px;padding:5px 7px;border:0;border-radius:6px;background:transparent;color:#43536a;font-size:10px;text-align:left}button:hover{background:var(--surface-selected);color:var(--brand-blue-strong)}.flow-line{position:relative;width:32px;border-top:1.5px solid #263546}.flow-line::after{position:absolute;top:-4px;right:-1px;border-width:4px 0 4px 6px;border-style:solid;border-color:transparent transparent transparent #263546;content:""}.flow-line.info{border-top-style:dashed}.flow-line.electronic{border-top-style:dotted}.symbol-list{display:grid;padding:5px 9px}.symbol-list button{grid-template-columns:30px 1fr auto}.symbol-list small{font-size:16px;opacity:0}.symbol-list button:hover small{opacity:1}
</style>
