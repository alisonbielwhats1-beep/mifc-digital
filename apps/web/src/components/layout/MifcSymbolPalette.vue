<script setup lang="ts">
import { ref } from "vue";
import { Building2, ChevronDown, ChevronUp, Database, FileText, KanbanSquare, PackageOpen, Pause, Square, Truck } from "@lucide/vue";
import type { MifcFlowType } from "@mifc/domain";
import type { LayoutNodeType } from "@/stores/mifc-layout";

defineEmits<{ add: [type: LayoutNodeType, label?: string]; flow: [type: MifcFlowType] }>();
const collapsed = ref(false);
const symbols: Array<{ type: LayoutNodeType; label: string; purpose: string; icon: unknown }> = [
  { type: "process", label: "Processo", purpose: "Máquina ou etapa de transformação", icon: Square },
  { type: "storage", label: "Buffer", purpose: "WIP entre processos — símbolo PBIP", icon: PackageOpen },
  { type: "storage", label: "Estoque", purpose: "Ponto de matéria-prima ou produto acabado", icon: PackageOpen },
  { type: "stagnation", label: "Estagnação", purpose: "Material parado ou segregado", icon: Pause },
  { type: "database", label: "Base de dados", purpose: "Sistema ou fonte eletrônica", icon: Database },
  { type: "customer_supplier", label: "Cliente / fornecedor", purpose: "Origem ou destino externo", icon: Building2 },
  { type: "truck", label: "Transporte", purpose: "Movimentação ou expedição", icon: Truck },
  { type: "kanban", label: "Kanban", purpose: "Sinal de reposição documentado", icon: KanbanSquare },
  { type: "information", label: "Informação", purpose: "Documento, regra ou instrução", icon: FileText },
];
</script>

<template>
  <aside class="symbol-palette" aria-label="Biblioteca de símbolos MIFC">
    <header><strong>Símbolos MIFC</strong><button type="button" :aria-label="collapsed ? 'Expandir biblioteca de símbolos' : 'Recolher biblioteca de símbolos'" @click="collapsed=!collapsed"><ChevronDown v-if="collapsed" :size="15" /><ChevronUp v-else :size="15" /></button></header>
    <template v-if="!collapsed">
      <div class="group-label">Fluxos documentados</div>
      <div class="flow-symbols"><button type="button" title="Material empurrado entre etapas" @click="$emit('flow','material_push')"><span class="flow-line solid"></span><span>Fluxo de material</span></button><button type="button" title="Material puxado por consumo" @click="$emit('flow','material_pull')"><span class="flow-line pull"></span><span>Material puxado</span></button><button type="button" title="Informação física ou verbal" @click="$emit('flow','information')"><span class="flow-line info"></span><span>Fluxo de informação</span></button><button type="button" title="Informação transmitida por sistema" @click="$emit('flow','electronic_information')"><span class="flow-line electronic"></span><span>Informação eletrônica</span></button></div>
      <div class="group-label">Blocos e pontos de estoque</div>
      <div class="symbol-list"><button v-for="symbol in symbols" :key="`${symbol.type}-${symbol.label}`" type="button" :title="symbol.purpose" :aria-label="`Adicionar ${symbol.label.toLocaleLowerCase('pt-BR')}: ${symbol.purpose}`" @click="$emit('add',symbol.type,symbol.label)"><component :is="symbol.icon" :size="22" /><span>{{ symbol.label }}</span><small>+</small></button></div>
      <footer>Fonte: símbolos extraídos do PBIP <ChevronUp :size="13" /></footer>
    </template>
  </aside>
</template>

<style scoped>
.symbol-palette{position:absolute;z-index:30;top:14px;left:14px;width:194px;overflow:hidden;border:1px solid var(--border-subtle);border-radius:9px;background:rgba(255,255,255,.97);box-shadow:0 8px 24px rgba(16,34,62,.11);backdrop-filter:blur(8px)}header,footer{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;font-size:10px}header{border-bottom:1px solid var(--border-subtle)}header button{display:grid;width:30px;min-height:30px;grid-template-columns:1fr;place-items:center;padding:0}footer{border-top:1px solid var(--border-subtle);color:var(--text-secondary);font-size:8px}.group-label{padding:8px 12px 2px;color:var(--text-tertiary);font-size:7px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.flow-symbols{display:grid;padding:3px 9px 6px;border-bottom:1px solid var(--border-subtle)}button{display:grid;width:100%;grid-template-columns:38px 1fr auto;align-items:center;gap:7px;min-height:34px;padding:4px 7px;border:0;border-radius:6px;background:transparent;color:#43536a;font-size:9px;text-align:left}button:hover{background:var(--surface-selected);color:var(--brand-blue-strong)}.flow-line{position:relative;width:32px;border-top:1.5px solid #263546}.flow-line::after{position:absolute;top:-4px;right:-1px;border-width:4px 0 4px 6px;border-style:solid;border-color:transparent transparent transparent #263546;content:""}.flow-line.info{border-top-style:dashed}.flow-line.electronic{border-top-style:dotted}.flow-line.pull::before{position:absolute;top:-4px;left:-1px;border-width:4px 6px 4px 0;border-style:solid;border-color:transparent #263546 transparent transparent;content:""}.symbol-list{display:grid;padding:3px 9px 6px}.symbol-list button{grid-template-columns:30px 1fr auto}.symbol-list small{font-size:16px;opacity:0}.symbol-list button:hover small{opacity:1}
</style>
