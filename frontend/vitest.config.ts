import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      // Make "backend/lib" imports work in tests
      "backend/lib": path.resolve(__dirname, "../backend/lib"),
    },
  },
});
