import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2021',
      },
      module: { type: 'es6' },
    }),
  ],
});
