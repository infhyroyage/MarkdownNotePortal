import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@types": path.resolve(__dirname, "./types"),
      "@utils": path.resolve(__dirname, "./utils"),
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
        "**/cdk.out/**",
        "**/coverage/**",
        "**/types/**",
      ],
      thresholds: {
        statements: 80,
      },
    },
  },
});
