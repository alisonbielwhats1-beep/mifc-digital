import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { clientProcessLanes } from "@/domain/client-process-matrix";
import { cloneRecord, effectiveActionStatus, mergeOracleProduct, type ActionRecord, type MasterDataRecord, type OperationsSettings, type ProcessRecord, type ProductRecord, type ResourceRecord } from "@/domain/operations";

const STORAGE_KEY = "mifc-digital:prompt-7:revision-04";
const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

const processSeeds: ProcessRecord[] = [
  ["lct","LCT","LCT",10,"Corte","node-cut","T-LCT/RF2","",""],
  ["rf2","RF2","Roll Former 2",20,"Conformação","node-rf2","","",""],
  ["rf3","RF3","Roll Former 3",30,"Conformação","node-stamp","T-RF3","D-P-RF3","P-RF3"],
  ["mesa3","M3","Mesa 3",40,"Solda","node-weld-1","T-M3","",""],
  ["beatty1","B1","Beatty 1",50,"Solda","node-weld-2","T-B1","D-P-B1","P-B1"],
  ["beatty2","B2","Beatty 2",51,"Solda","node-beatty-2","T-B2","D-P-B2","P-B2"],
  ["beatty3","B3","Beatty 3",52,"Solda","node-beatty-3","T-B3","D-P-B3","P-B3"],
  ["beatty4","B4","Beatty 4",53,"Solda","node-beatty-4","T-B4","D-P-B4","P-B4"],
  ["pa","PA","P.A",60,"Acabamento","node-weld-3","T-P.A","D-P-P.A","P-P.A"],
  ["cnc","CNC","CNC Plasma",61,"Corte","node-cnc","T-CNC","D-P-CNC","P-CNC"],
  ["paint","PINT","Pintura",70,"Pintura","node-assembly","T-LPP2","D-P-LPP2","P-LPP2"],
  ["riveting","REB","Rebitagem",71,"Montagem","node-rework","T-SCA-REB / T-DAF-REB","",""],
  ["stenhoj","STJ","Stenhoj",80,"Montagem","node-inspection","T-STJ","D-P-STJ","P-STJ"],
  ["packaging","EMB","Embalagem",90,"Logística","node-packaging","T-EMB-VM","",""],
  ["shipping","EXP","Expedição",100,"Logística","node-shipping","","",""],
].map(([id,code,name,sequence,type,layoutNodeId,powerBiMeasure,demandMeasure,productionMeasure]) => ({
  id: String(id), code: String(code), name: String(name), sequence: Number(sequence), type: String(type),
  customerKeys: [], productIds: [], resourceIds: [], layoutNodeId: String(layoutNodeId), powerBiMeasure: String(powerBiMeasure),
  demandMeasure: String(demandMeasure), productionMeasure: String(productionMeasure), status:"active", notes:"",
  validation:"mapped", updatedAt: now(),
}));

function applyMatrix(processes: ProcessRecord[]) {
  const byStage: Record<string,string[]> = { lct:["lct"], rf2:["rf2"], "lct-rf2":["lct","rf2"], rf3:["rf3"], "mesa-3":["mesa3"], beattys:["beatty1","beatty2","beatty3","beatty4"], pa:["pa"], cnc:["cnc"], "pa-cnc":["pa","cnc"], paint:["paint"], rework:["riveting"], "paint-rework":["paint","riveting"], stenhoj:["stenhoj"], packaging:["packaging"], shipping:["stenhoj","packaging","shipping"] };
  for (const lane of clientProcessLanes) for (const mapping of lane.mappings) {
    if (!mapping.participates) continue;
    const ids = byStage[mapping.stageId] ?? [];
    let selected = ids;
    if (mapping.stageId === "beattys") selected = mapping.processMeasureKeys.map((key) => `beatty${key.slice(-1)}`);
    if (["pa-cnc", "pa"].includes(mapping.stageId)) selected = mapping.processMeasureKeys.includes("T-CNC") ? ["cnc"] : ["pa"];
    if (["paint-rework", "paint", "rework"].includes(mapping.stageId)) selected = mapping.processMeasureKeys.some((key) => key.includes("REB")) ? ["riveting"] : ["paint"];
    for (const id of selected) {
      const process = processes.find((item) => item.id === id);
      if (process && !process.customerKeys.includes(lane.key)) process.customerKeys.push(lane.key);
    }
  }
  const vmMesa = processes.find((item) => item.id === "mesa3");
  if (vmMesa) { vmMesa.validation = "pending"; vmMesa.notes = "Participação Volvo VM pendente; não considerada na rota até confirmação operacional."; }
}
applyMatrix(processSeeds);

const productSeeds: ProductRecord[] = [
  ["prod-fh","FH","Volvo FH","FH","Volvo","LONGARINA","—","—",["lct","rf2","rf3","mesa3","beatty4","pa","paint","stenhoj","packaging","shipping"]],
  ["prod-vm","VM","Volvo VM","VM","Volvo","LONGARINA","—","—",["rf3","beatty1","cnc","paint","packaging","shipping"]],
  ["prod-sca","SCA","Scania","SCA","Scania","LONGARINA","—","—",["rf3","mesa3","beatty3","pa","paint","riveting","stenhoj","packaging","shipping"]],
  ["prod-daf","DAF","DAF","DAF","DAF","LONGARINA","—","—",["rf3","mesa3","beatty2","cnc","paint","riveting","stenhoj","packaging","shipping"]],
].map(([id,code,description,customer,family,productClass,hand,material,route]) => ({ id:String(id),code:String(code),description:String(description),customer:String(customer),family:String(family),productClass:String(productClass),hand:String(hand),material:String(material),status:"active",origin:"LOCAL",updatedAt:now(),routeProcessIds:route as string[],overrides:{} }));

const resourceSeeds: ResourceRecord[] = [
  ["res-rf3","RF3","Roll Former 3","rf3","cap-rf3","P-RF3","D-P-RF3","P-R-RF3","P-P-RF3","DT-RF3"],
  ...[1,2,3,4].map((n) => [`res-b${n}`,`B${n}`,`Beatty ${n}`,`beatty${n}`,n===1?"cap-beatty":`cap-beatty-${n}`,`P-B${n}`,`D-P-B${n}`,`P-R-B${n}`,`P-P-B${n}`,`DT-B${n}`]),
  ["res-lct","LCT","LCT","lct","cap-lct","","","","",""],
  ["res-rf2","RF2","Roll Former 2","rf2","cap-rf2","","","","",""],
  ["res-pa","PA","P.A","pa","cap-pa","P-P.A","D-P-P.A","P-R-P.A","P-P-P.A",""],
  ["res-cnc","CNC","CNC Plasma","cnc","cap-cnc","P-CNC","D-P-CNC","P-R-CNC","P-P-CNC",""],
  ["res-paint","PINT","Linha de Pintura","paint","cap-paint","P-LPP2","D-P-LPP2","P-R-LPP2","P-P-LPP2",""],
  ["res-stj","STJ","Stenhoj","stenhoj","cap-stenhoj","P-STJ","D-P-STJ","P-R-STJ","P-P-STJ",""],
].map(([id,code,name,processId,capacityRowId,productionMeasure,demandMeasure,remainingMeasure,programmedStopsMeasure,downtimeMeasure]) => ({ id:String(id),code:String(code),name:String(name),processId:String(processId),capacityRowId:String(capacityRowId),availableHoursPerDay:0,availableMinutes:0,shifts:2,oeeTarget:85,productionMeasure:String(productionMeasure),demandMeasure:String(demandMeasure),remainingMeasure:String(remainingMeasure),programmedStopsMeasure:String(programmedStopsMeasure),downtimeMeasure:String(downtimeMeasure),operationalStatus:"unknown",status:"active",origin:"LOCAL",updatedAt:now() }));

for (const process of processSeeds) process.resourceIds = resourceSeeds.filter((resource) => resource.processId === process.id).map((resource) => resource.id);
for (const product of productSeeds) for (const processId of product.routeProcessIds) processSeeds.find((item) => item.id === processId)?.productIds.push(product.id);

const masterSeeds: MasterDataRecord[] = [
  ["md-plant","Contexto","PLANT","Planta padrão","MFC - Osasco","","LOCAL"],
  ["md-year","Contexto","YEAR","Ano padrão","2026","ano","LOCAL"],
  ["md-oee","Metas","OEE_TARGET","Meta OEE","85","%","LOCAL"],
  ["md-day","Unidades","DAY","Lead time","dia","","CALCULATED"],
].map(([id,category,key,label,value,unit,origin]) => ({id:String(id),category:String(category),key:String(key),label:String(label),value:String(value),unit:String(unit),origin:origin as MasterDataRecord["origin"],status:"active",notes:"",updatedAt:now()}));

export const useOperationsStore = defineStore("operations", () => {
  const products = ref<ProductRecord[]>(structuredClone(productSeeds));
  const processes = ref<ProcessRecord[]>(structuredClone(processSeeds));
  const resources = ref<ResourceRecord[]>(structuredClone(resourceSeeds));
  const actions = ref<ActionRecord[]>([]);
  const masterData = ref<MasterDataRecord[]>(structuredClone(masterSeeds));
  const settings = ref<OperationsSettings>({ autoSave:true, compactTables:false, confirmDeletes:true, defaultActionsView:"table", refreshSeconds:30, showSourceBadges:true });
  const hydrated = ref(false);
  const actionSummary = computed(() => ({ total:actions.value.length, open:actions.value.filter((a)=>!["completed","cancelled"].includes(a.status)).length, inProgress:actions.value.filter((a)=>a.status==="in_progress").length, overdue:actions.value.filter((a)=>effectiveActionStatus(a)==="overdue").length, completed:actions.value.filter((a)=>a.status==="completed").length }));
  function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify({schemaVersion:1,products:products.value,processes:processes.value,resources:resources.value,actions:actions.value,masterData:masterData.value,settings:settings.value})); }
  function hydrate() { if (hydrated.value) return; try { const raw=localStorage.getItem(STORAGE_KEY); if(raw){const data=JSON.parse(raw); if(data.schemaVersion===1){ products.value=data.products??productSeeds; processes.value=data.processes??processSeeds; resources.value=data.resources??resourceSeeds; actions.value=data.actions??[]; masterData.value=data.masterData??masterSeeds; settings.value={...settings.value,...data.settings}; } } } catch { /* mantém sementes válidas */ } hydrated.value=true; }
  function saveIfNeeded() { if(settings.value.autoSave) persist(); }
  function upsert<T extends {id:string;updatedAt:string}>(list:{value:T[]}, record:T) { const updated={...record,updatedAt:now()}; const index=list.value.findIndex((item)=>item.id===record.id); if(index<0) list.value.push(updated); else list.value[index]=updated; saveIfNeeded(); return updated; }
  const api = {
    upsertProduct:(record:ProductRecord)=>upsert(products,record), upsertProcess:(record:ProcessRecord)=>upsert(processes,record), upsertResource:(record:ResourceRecord)=>upsert(resources,record), upsertAction:(record:ActionRecord)=>upsert(actions,record), upsertMasterData:(record:MasterDataRecord)=>upsert(masterData,record),
    duplicateProduct:(id:string)=>{const item=products.value.find((x)=>x.id===id);if(item)upsert(products,{...cloneRecord(item,uid("product")),code:`${item.code}-COPIA`,origin:"LOCAL",sourceKey:undefined});},
    duplicateProcess:(id:string)=>{const item=processes.value.find((x)=>x.id===id);if(item)upsert(processes,{...cloneRecord(item,uid("process")),code:`${item.code}-COPIA`,validation:"pending"});},
    duplicateResource:(id:string)=>{const item=resources.value.find((x)=>x.id===id);if(item)upsert(resources,{...cloneRecord(item,uid("resource")),code:`${item.code}-COPIA`,origin:"LOCAL"});},
    duplicateAction:(id:string)=>{const item=actions.value.find((x)=>x.id===id);if(item)upsert(actions,{...cloneRecord(item,uid("action")),number:`${item.number}-C`,status:"not_started",progress:0,completedAt:undefined});},
  };
  function remove(kind:"product"|"process"|"resource"|"action"|"master",id:string){ const map={product:products,process:processes,resource:resources,action:actions,master:masterData}; map[kind].value=map[kind].value.filter((item)=>item.id!==id) as never; saveIfNeeded(); }
  function toggle(kind:"product"|"process"|"resource"|"master",id:string){ const map={product:products,process:processes,resource:resources,master:masterData}; const item=map[kind].value.find((x)=>x.id===id); if(item){item.status=item.status==="active"?"inactive":"active";item.updatedAt=now();saveIfNeeded();} }
  async function syncOracleProducts(){ const response=await fetch("/api/master-data/products",{cache:"no-store"}); if(!response.ok)throw new Error("Não foi possível ler o catálogo de produtos do cache Oracle."); const data=await response.json() as {products:Array<Omit<ProductRecord,"overrides">>}; for(const incoming of data.products){const current=products.value.find((p)=>p.sourceKey===incoming.sourceKey);const merged=mergeOracleProduct(current,incoming); if(current) products.value[products.value.indexOf(current)]=merged; else products.value.push(merged);} persist(); return data.products.length; }
  function syncCapacity(rows:Array<{id:string;availableHoursPerDay:number;shifts:number;cycleTimeSeconds:number;referenceCapacityPerDay?:number|null;efficiencyPercent:number}>){for(const resource of resources.value){const row=rows.find((r)=>r.id===resource.capacityRowId);if(row)Object.assign(resource,{availableHoursPerDay:row.availableHoursPerDay,availableMinutes:row.availableHoursPerDay*60,shifts:row.shifts,cycleTimeSeconds:row.cycleTimeSeconds,capacityPerDay:row.referenceCapacityPerDay??undefined,availabilityPercent:row.efficiencyPercent,updatedAt:now()});}saveIfNeeded();}
  function reset(){products.value=structuredClone(productSeeds);processes.value=structuredClone(processSeeds);resources.value=structuredClone(resourceSeeds);actions.value=[];masterData.value=structuredClone(masterSeeds);localStorage.removeItem(STORAGE_KEY);}
  return {products,processes,resources,actions,masterData,settings,hydrated,actionSummary,hydrate,persist,remove,toggle,syncOracleProducts,syncCapacity,reset,...api,uid};
});
