import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
// @ts-expect-error Vite plugin is plain ESM JS (no types)
import { gmInterimWsPlugin } from './scripts/vite-gm-interim-ws-plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), gmInterimWsPlugin()],
  // Same-WiFi table play: advertise a Network URL so devices can open the SPA
  // via the GM LAN IP when needed. Join Session browse still uses the local
  // interim host GET /discover (does not require loading the SPA from the GM).
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
