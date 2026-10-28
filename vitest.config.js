import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/__tests__/**/*.test.js'],
    testTimeout: 10000,
    // Initialisation d'une base vide (tables + données de démo hachées) : plus longue qu'un test.
    hookTimeout: 60000,
    // Plusieurs fichiers initialisent la même base MySQL : exécution séquentielle pour éviter les blocages.
    fileParallelism: false,
  },
});
