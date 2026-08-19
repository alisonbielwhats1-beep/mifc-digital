import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: currentDirectory,
  resolve: {
    alias: {
      "@": path.resolve(currentDirectory, "src"),
      "@mifc/calculation-engine": path.resolve(currentDirectory, "../../packages/calculation-engine/src/index.ts"),
      "@mifc/domain": path.resolve(currentDirectory, "../../packages/domain/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
