import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useMifcFormsStore } from "@/stores/mifc-forms";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

beforeEach(() => {
  setActivePinia(createPinia());
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new MemoryStorage() });
});

describe("migração dos parâmetros de capacidade", () => {
  it("separa as quatro Beattys sem perder o valor editado da Beatty antiga", () => {
    localStorage.setItem("mifc-digital:prompt-3:revision-04", JSON.stringify({
      schemaVersion: 1,
      shiftRows: [], volumeRows: [], logisticsRows: [], bufferRows: [],
      capacityRows: [{
        id: "cap-beatty", sequence: 1, processCode: "P-002", process: "Beatty", cycleTimeSeconds: 62,
        nominalCapacityPerHour: 58, referenceCapacityPerDay: 928, shifts: 2, availableHoursPerDay: 17.25,
        efficiencyPercent: 82, targetWipPieces: 132, speedUnit: "peças/h", status: "active",
      }],
    }));

    const store = useMifcFormsStore();
    store.hydrate();
    expect(store.capacityRows.filter((row) => /^cap-beatty(?:-[234])?$/.test(row.id))).toHaveLength(4);
    expect(store.capacityRows.filter((row) => /^cap-beatty(?:-[234])?$/.test(row.id)).every((row) => row.availableHoursPerDay === 17.25)).toBe(true);
    expect(store.capacityRows.map((row) => row.id)).toEqual(expect.arrayContaining(["cap-lct", "cap-pa", "cap-cnc"]));
  });

  it("adiciona Beneficiador com zero dias aos parâmetros logísticos já salvos", () => {
    localStorage.setItem("mifc-digital:prompt-3:revision-04", JSON.stringify({
      schemaVersion: 2,
      shiftRows: [], volumeRows: [], bufferRows: [], capacityRows: [],
      logisticsRows: [{
        id: "log-fh", customer: "Volvo FH", vehicle: "FH", flatbed: "", plannedDate: "2026-08-19",
        shipDate: "", plannedTime: "06:00", transportHours: 4, movementMinutes: 5, shipmentFrequency: "Diária",
        shipmentLotSize: 0, material: "Aguardando MES", item: "Aguardando MES", location: "Aguardando MES",
        orderedQuantity: null, finishedQuantity: null, mesOrigin: "ORACLE_MES", status: "active",
      }],
    }));

    const store = useMifcFormsStore();
    store.hydrate();

    expect(store.schemaVersion).toBe(3);
    expect(store.logisticsRows[0].beneficiatorDays).toBe(0);
  });
});
