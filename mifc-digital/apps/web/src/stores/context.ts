import { defineStore } from "pinia";
import { demoPlants, demoRevisions, demoScenarios } from "@/data/demo";

export const useContextStore = defineStore("context", {
  state: () => ({
    plants: demoPlants,
    scenarios: demoScenarios,
    revisions: demoRevisions,
    selectedPlantId: demoPlants[0]?.id ?? "",
    selectedScenarioId: demoScenarios[0]?.id ?? "",
    selectedRevisionId: demoRevisions[0]?.id ?? "",
    selectedYear: demoScenarios[0]?.year ?? new Date().getFullYear(),
    changedAt: null as string | null,
    hydrated: false,
  }),
  getters: {
    selectedPlant: (state) => state.plants.find((item) => item.id === state.selectedPlantId),
    selectedScenario: (state) => state.scenarios.find((item) => item.id === state.selectedScenarioId),
    selectedRevision: (state) => state.revisions.find((item) => item.id === state.selectedRevisionId),
    availableYears: (state) => [...new Set(state.scenarios.map((item) => item.year))].sort((left, right) => right - left),
    scenariosForYear: (state) => state.scenarios.filter((item) => item.year === state.selectedYear && item.plantId === state.selectedPlantId),
    contextKey(state): string {
      return `${state.selectedPlantId}:${state.selectedYear}:${state.selectedScenarioId}:${state.selectedRevisionId}`;
    },
  },
  actions: {
    hydrate() {
      if (this.hydrated) return;
      try {
        const raw = localStorage.getItem("mifc-digital:global-context");
        const saved = raw ? JSON.parse(raw) as Partial<{ selectedPlantId: string; selectedYear: number; selectedScenarioId: string; selectedRevisionId: string }> : null;
        if (saved?.selectedPlantId && this.plants.some((item) => item.id === saved.selectedPlantId)) this.selectedPlantId = saved.selectedPlantId;
        if (Number.isInteger(saved?.selectedYear)) this.selectedYear = Number(saved?.selectedYear);
        if (saved?.selectedScenarioId && this.scenarios.some((item) => item.id === saved.selectedScenarioId)) this.selectedScenarioId = saved.selectedScenarioId;
        if (saved?.selectedRevisionId) this.selectedRevisionId = saved.selectedRevisionId;
      } catch {
        // Mantém o contexto canônico local quando o snapshot é inválido.
      }
      this.normalize();
      this.hydrated = true;
    },
    normalize() {
      const scenario = this.scenarios.find((item) => item.id === this.selectedScenarioId && item.year === this.selectedYear && item.plantId === this.selectedPlantId)
        ?? this.scenarios.find((item) => item.year === this.selectedYear && item.plantId === this.selectedPlantId)
        ?? this.scenarios.find((item) => item.plantId === this.selectedPlantId);
      if (scenario) {
        this.selectedScenarioId = scenario.id;
        this.selectedYear = scenario.year;
      }
    },
    persist() {
      this.normalize();
      this.changedAt = new Date().toISOString();
      localStorage.setItem("mifc-digital:global-context", JSON.stringify({
        selectedPlantId: this.selectedPlantId,
        selectedYear: this.selectedYear,
        selectedScenarioId: this.selectedScenarioId,
        selectedRevisionId: this.selectedRevisionId,
      }));
    },
  },
});
