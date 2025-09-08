import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
    hookTimeout: 20000,
    testTimeout: 20000,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});

