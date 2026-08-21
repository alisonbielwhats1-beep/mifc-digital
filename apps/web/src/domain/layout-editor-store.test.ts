import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { LAYOUT_WORLD_HEIGHT, LAYOUT_WORLD_WIDTH, useMifcLayoutStore } from "@/stores/mifc-layout";

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
    expect([b3.y,b4.y,b2.y,b1.y]).toEqual([300,400,500,600]);
    expect(b3.x).toBeLessThan(b4.x);expect(b4.x).toBeLessThan(b2.x);expect(b2.x).toBeLessThan(b1.x);
    expect([b1,b2,b3,b4].every((item)=>item.width>=132&&item.height>=88)).toBe(true);
    expect(LAYOUT_WORLD_WIDTH).toBeGreaterThanOrEqual(2200);expect(LAYOUT_WORLD_HEIGHT).toBeGreaterThanOrEqual(1100);
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

  it("persiste a revisão visual no schema 5",()=>{
    const store=useMifcLayoutStore();store.hydrate();store.save();
    const payload=JSON.parse(localStorage.getItem("mifc-digital:layout-reference-v2")??"{}");
    expect(payload.schemaVersion).toBe(5);
  });
});
