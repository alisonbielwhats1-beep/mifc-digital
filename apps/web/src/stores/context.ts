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
  }),
  getters: {
    selectedPlant: (state) => state.plants.find((item) => item.id === state.selectedPlantId),
    selectedScenario: (state) => state.scenarios.find((item) => item.id === state.selectedScenarioId),
    selectedRevision: (state) => state.revisions.find((item) => item.id === state.selectedRevisionId),
  },
});
