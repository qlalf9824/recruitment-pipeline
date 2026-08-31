import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['src/testSetup.ts'],
  },
})
