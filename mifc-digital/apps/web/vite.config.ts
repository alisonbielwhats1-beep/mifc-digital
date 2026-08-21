import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: currentDirectory,
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(currentDirectory, "src"),
      "@mifc/domain": path.resolve(currentDirectory, "../../packages/domain/src/index.ts"),
      "@mifc/calculation-engine": path.resolve(currentDirectory, "../../packages/calculation-engine/src/index.ts"),
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:5174",
    },
  },
  build: {
    outDir: path.resolve(currentDirectory, "../../dist/web"),
    emptyOutDir: true,
  },
});
