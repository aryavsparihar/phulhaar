/**
 * Unit tests. They run in Node, not in a worker, so anything they touch has to be ordinary
 * TypeScript with no Oxygen globals: field validation, the size and orientation rules, the PJK
 * request signing. Whatever genuinely needs a browser or a running store belongs in the
 * Playwright suite instead.
 */
import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'scripts/**/*.test.ts', 'mocks/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
});
