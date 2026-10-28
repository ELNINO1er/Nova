import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/__tests__/**/*.test.js'],
    testTimeout: 10000,
    // Plusieurs fichiers initialisent la même base MySQL : exécution séquentielle pour éviter les blocages.
    fileParallelism: false,
  },
});
