import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular({ tsconfig: 'tsconfig.spec.json' })],
  resolve: {
    alias: {
      // The shared suite lives in packages/spec in the monorepo; here it is vendored.
      '@bighatpoland/spec/src/suites': resolve(import.meta.dirname, 'src/test/suites.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
