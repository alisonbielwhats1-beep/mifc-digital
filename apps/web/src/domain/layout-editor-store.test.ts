import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { LAYOUT_WORLD_HEIGHT, LAYOUT_WORLD_WIDTH, useMifcLayoutStore, type LayoutRevision } from "@/stores/mifc-layout";

class MemoryStorage implements Storage {
  private values=new Map<string,string>();
  get length(){return this.values.size;} clear(){this.values.clear();}
  getItem(key:string){return this.values.get(key)??null;} key(index:number){return [...this.values.keys()][index]??null;}
  removeItem(key:string){this.values.delete(key);} setItem(key:string,value:string){this.values.set(key,value);}
}

beforeEach(()=>{setActivePinia(createPinia());Object.defineProperty(globalThis,"localStorage",{configurable:true,value:new MemoryStorage()});});

describe("editor legível e seleção em grupo",()=>{
  it("posiciona as Beattys em cascata conforme o arranjo físico do PBIP",()=>{
    const store=useMifcLayoutStore();store.hydrate();
    const b3=store.activeRevision.nodes.find((item)=>item.id==="node-beatty-3")!;
    const b4=store.activeRevision.nodes.find((item)=>item.id==="node-beatty-4")!;
    const b2=store.activeRevision.nodes.find((item)=>item.id==="node-beatty-2")!;
    const b1=store.activeRevision.nodes.find((item)=>item.id==="node-weld-2")!;
    expect([b3.y,b4.y,b2.y,b1.y]).toEqual([280,500,720,940]);
    expect(b3.x).toBeLessThan(b4.x);expect(b4.x).toBeLessThan(b2.x);expect(b2.x).toBeLessThan(b1.x);
    expect([b1,b2,b3,b4].every((item)=>item.width>=150&&item.height>=108)).toBe(true);
    for (const [current,next] of [[b3,b4],[b4,b2],[b2,b1]]) {
      expect(next.y-(current.y+current.height)).toBeGreaterThanOrEqual(90);
    }
    const support=store.activeRevision.nodes.find((item)=>item.id==="node-quality-control")!;
    expect(support.y-(b1.y+b1.height)).toBeGreaterThanOrEqual(120);
    expect(LAYOUT_WORLD_WIDTH).toBeGreaterThanOrEqual(3200);expect(LAYOUT_WORLD_HEIGHT).toBeGreaterThanOrEqual(1600);
  });

  it("mantém corredores legíveis entre as etapas principais",()=>{
    const store=useMifcLayoutStore();store.hydrate();
    const ids=["node-raw","node-cut","node-stamp","node-weld-1","node-weld-3","node-assembly","node-inspection","node-finished","node-shipping"];
    const stages=ids.map((id)=>store.activeRevision.nodes.find((item)=>item.id===id)!);
    for (const [current,next] of stages.slice(0,-1).map((item,index)=>[item,stages[index+1]] as const)) {
      expect(next.x-(current.x+current.width)).toBeGreaterThanOrEqual(60);
    }
  });

  it("remove vários blocos e todas as suas conexões em uma única mutação",()=>{
    const store=useMifcLayoutStore();store.hydrate();
    const ids=["node-beatty-3","node-beatty-4"];
    const previousUndo=store.undoStack.length;
    store.deleteNodes(ids);
    expect(store.activeRevision.nodes.some((item)=>ids.includes(item.id))).toBe(false);
    expect(store.activeRevision.edges.some((item)=>ids.includes(item.sourceNodeId)||ids.includes(item.targetNodeId))).toBe(false);
    expect(store.undoStack).toHaveLength(previousUndo+1);
    store.undo();expect(store.activeRevision.nodes.filter((item)=>ids.includes(item.id))).toHaveLength(2);
  });

  it("inclui o Beneficiador no início do fluxo de materiais",()=>{
    const store=useMifcLayoutStore();store.hydrate();
    const beneficiator=store.activeRevision.nodes.find((item)=>item.id==="node-beneficiator");
    expect(beneficiator).toMatchObject({label:"Beneficiador",type:"customer_supplier"});
    expect(store.activeRevision.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({sourceNodeId:"node-usiminas",targetNodeId:"node-beneficiator",flowType:"material_push"}),
      expect.objectContaining({sourceNodeId:"node-csn",targetNodeId:"node-beneficiator",flowType:"material_push"}),
      expect.objectContaining({sourceNodeId:"node-gerdau",targetNodeId:"node-beneficiator",flowType:"material_push"}),
      expect.objectContaining({sourceNodeId:"node-beneficiator",targetNodeId:"node-raw",flowType:"material_push"}),
    ]));
  });

  it("migra o schema 6 para o layout expandido sem perder a personalização",()=>{
    const legacy=useMifcLayoutStore();
    const revision=JSON.parse(JSON.stringify(legacy.activeRevision)) as LayoutRevision;
    const beatty3=revision.nodes.find((item)=>item.id==="node-beatty-3")!;
    beatty3.x=1;beatty3.y=1;beatty3.label="Beatty 3 Especial";
    localStorage.setItem("mifc-digital:layout-reference-v2",JSON.stringify({schemaVersion:6,activeRevisionId:revision.id,revisions:[revision]}));
    setActivePinia(createPinia());
    const store=useMifcLayoutStore();store.hydrate();
    expect(store.activeRevision.nodes.find((item)=>item.id==="node-beatty-3")).toMatchObject({x:1380,y:280,label:"Beatty 3 Especial"});
  });

  it("persiste a revisão visual no schema 7",()=>{
    const store=useMifcLayoutStore();store.hydrate();store.save();
    const payload=JSON.parse(localStorage.getItem("mifc-digital:layout-reference-v2")??"{}");
    expect(payload.schemaVersion).toBe(7);
  });
});
