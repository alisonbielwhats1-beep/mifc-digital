import { defineStore } from "pinia";

export type SaveStatus = "idle" | "saving" | "success" | "error";

export const useUiStore = defineStore("ui", {
  state: () => ({
    sidebarCollapsed: false,
    mobileNavigationOpen: false,
    saveStatus: "idle" as SaveStatus,
    toastMessage: "",
  }),
  actions: {
    showError(message: string) {
      this.saveStatus = "error";
      this.toastMessage = message;
      window.setTimeout(() => {
        this.saveStatus = "idle";
        this.toastMessage = "";
      }, 4500);
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    toggleMobileNavigation() {
      this.mobileNavigationOpen = !this.mobileNavigationOpen;
    },
    closeMobileNavigation() {
      this.mobileNavigationOpen = false;
    },
    async saveDemoRevision(payload: unknown) {
      this.saveStatus = "saving";
      try {
        localStorage.setItem("mifc-digital:demo-revision", JSON.stringify(payload));
        await new Promise((resolve) => window.setTimeout(resolve, 280));
        this.saveStatus = "success";
        this.toastMessage = "Revisão salva localmente.";
        window.setTimeout(() => {
          this.saveStatus = "idle";
          this.toastMessage = "";
        }, 3500);
      } catch {
        this.showError("Não foi possível salvar. Libere o armazenamento local e tente novamente.");
      }
    },
  },
});
