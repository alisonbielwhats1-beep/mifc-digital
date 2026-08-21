import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { effectiveActionStatus, mergeOracleProduct, type ActionRecord, type ProductRecord } from "@/domain/operations";
import { useOperationsStore } from "@/stores/operations";

class MemoryStorage implements Storage {
  private values = new Map<string,string>();
  get length(){return this.values.size;} clear(){this.values.clear();}
  getItem(key:string){return this.values.get(key)??null;} key(index:number){return [...this.values.keys()][index]??null;}
  removeItem(key:string){this.values.delete(key);} setItem(key:string,value:string){this.values.set(key,value);}
}

beforeEach(()=>{setActivePinia(createPinia());Object.defineProperty(globalThis,"localStorage",{configurable:true,value:new MemoryStorage()});});

describe("cadastros integrados do Prompt 7",()=>{
  it("executa CRUD e duplicação de produtos, processos e recursos",()=>{
    const store=useOperationsStore();store.hydrate();
    const product={...JSON.parse(JSON.stringify(store.products[0])) as ProductRecord,id:"product-test",code:"TEST",description:"Produto teste"};
    store.upsertProduct(product);expect(store.products.find((item)=>item.id==="product-test")?.description).toBe("Produto teste");
    store.upsertProduct({...product,description:"Editado"});expect(store.products.find((item)=>item.id==="product-test")?.description).toBe("Editado");
    store.duplicateProduct("product-test");expect(store.products.some((item)=>item.code==="TEST-COPIA")).toBe(true);
    const process={...JSON.parse(JSON.stringify(store.processes[0])),id:"process-test",code:"PT",name:"Processo teste"};store.upsertProcess(process);store.duplicateProcess(process.id);expect(store.processes.some((item)=>item.code==="PT-COPIA")).toBe(true);
    const resource={...JSON.parse(JSON.stringify(store.resources[0])),id:"resource-test",code:"RT",name:"Recurso teste",processId:process.id};store.upsertResource(resource);store.duplicateResource(resource.id);expect(store.resources.some((item)=>item.code==="RT-COPIA")).toBe(true);
    store.remove("product","product-test");store.remove("process","process-test");store.remove("resource","resource-test");
    expect(store.products.some((item)=>item.id==="product-test")).toBe(false);
  });

  it("mantém vínculos produto × processo × recurso e ação × Layout",()=>{
    const store=useOperationsStore();store.hydrate();
    const product=store.products.find((item)=>item.id==="prod-fh")!;
    expect(product.routeProcessIds).toContain("rf3");
    expect(store.processes.find((item)=>item.id==="rf3")?.resourceIds).toContain("res-rf3");
    const action:ActionRecord={id:"action-layout",number:"AP-0001",title:"Ação RF3",problem:"Teste",originModule:"Layout",processId:"rf3",layoutNodeId:"node-stamp",cause:"",countermeasure:"Validar",owner:"Ana",priority:"high",status:"in_progress",progress:20,openedAt:"2026-08-01",dueAt:"2026-08-31",expectedImpact:"",evidence:"",notes:"",updatedAt:new Date().toISOString()};
    store.upsertAction(action);expect(store.actions[0].layoutNodeId).toBe("node-stamp");expect(store.actionSummary.open).toBe(1);
    store.upsertAction({...action,status:"completed",progress:100,completedAt:"2026-08-19"});expect(store.actionSummary.completed).toBe(1);
  });

  it("calcula atraso automaticamente sem sobrescrever o status-base",()=>{
    const action={status:"in_progress" as const,dueAt:"2026-08-10"};
    expect(effectiveActionStatus(action,new Date("2026-08-19T12:00:00"))).toBe("overdue");
    expect(action.status).toBe("in_progress");
    expect(effectiveActionStatus({status:"completed",dueAt:"2026-08-10"},new Date("2026-08-19T12:00:00"))).toBe("completed");
  });

  it("separa os valores Oracle dos overrides locais",()=>{
    const incoming:Omit<ProductRecord,"overrides">={id:"oracle-1",code:"ITEM-1",description:"Oracle",customer:"FH",family:"",productClass:"A",hand:"LH",finishLength:1000,material:"MP-1",status:"active",origin:"ORACLE_MES",sourceKey:"base1:ITEM-1:FH",updatedAt:"2026-08-19T10:00:00Z",routeProcessIds:[]};
    const current:ProductRecord={...incoming,description:"Override local",overrides:{description:"Override local"}};
    const merged=mergeOracleProduct(current,{...incoming,description:"Atualização Oracle",updatedAt:"2026-08-19T11:00:00Z"});
    expect(merged.description).toBe("Override local");expect(merged.origin).toBe("ORACLE_MES");expect(merged.updatedAt).toBe("2026-08-19T11:00:00Z");
  });

  it("restaura cadastros e ações após recarregar a página",()=>{
    const first=useOperationsStore();first.hydrate();const product={...JSON.parse(JSON.stringify(first.products[0])) as ProductRecord,id:"persisted",code:"SAVE"};first.upsertProduct(product);first.persist();
    setActivePinia(createPinia());const second=useOperationsStore();second.hydrate();expect(second.products.some((item)=>item.id==="persisted")).toBe(true);
  });
});
