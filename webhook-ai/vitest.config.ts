import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
    hookTimeout: 20000,
    testTimeout: 20000,
    // Evita travamentos eventuais de workers em CI
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    maxConcurrency: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});

