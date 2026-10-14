import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    pool: 'threads',
    // Each test file boots its own jsdom, and the default (one worker per CPU
    // minus one) starved memory on constrained machines: workers timed out
    // before they answered, so runs failed non-deterministically. Capping the
    // pool keeps concurrency comfortably below the failing regime.
    maxWorkers: 4,
    testTimeout: 15000,
  },
})