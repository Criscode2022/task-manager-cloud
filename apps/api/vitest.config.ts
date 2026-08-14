import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['test/**'],
    environment: 'node',
    globals: true,
  },
});
