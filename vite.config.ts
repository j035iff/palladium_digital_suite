import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
// @ts-expect-error Vite plugin is plain ESM JS (no types)
import { gmInterimWsPlugin } from './scripts/vite-gm-interim-ws-plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), gmInterimWsPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
