import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@types": path.resolve(__dirname, "./types"),
      "@layer": path.resolve(__dirname, "./layer/nodejs"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["**/*.ts"],
      exclude: [
        "**/tests/**",
        "**/node_modules/**",
        "**/*.config.ts",
        "**/dist/**",
        "**/coverage/**",
        "**/types/**",
      ],
      thresholds: {
        statements: 80,
      },
    },
  },
});
