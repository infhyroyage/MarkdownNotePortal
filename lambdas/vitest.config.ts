import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['**/*.ts'],
      exclude: [
        '**/tests/**',
        '**/node_modules/**',
        '**/*.config.ts',
        '**/dist/**',
        '**/coverage/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 79,
        statements: 80,
      },
    },
  },
});
