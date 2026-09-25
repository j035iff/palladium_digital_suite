/**
 * Vite plugin: auto-start interim GM WS relay during `vite` / `vite preview` for table proof.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

export function gmInterimWsPlugin() {
  /** @type {import('node:child_process').ChildProcess | null} */
  let child = null

  return {
    name: 'gm-interim-ws-host',
    apply: 'serve',
    configureServer() {
      if (process.env.VITEST || process.env.PDS_GM_WS_AUTOSTART === '0') return
      if (child) return
      try {
        require.resolve('ws')
      } catch {
        console.warn(
          '[gm-interim-ws] package "ws" not installed — skip auto-start. Run npm i && npm run gm:ws-host',
        )
        return
      }
      const script = join(root, 'scripts/gm-interim-ws-host.mjs')
      child = spawn(process.execPath, [script], {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env },
      })
      child.on('exit', (code) => {
        if (code && code !== 0) {
          console.warn(`[gm-interim-ws] exited with code ${code}`)
        }
        child = null
      })
      const stop = () => {
        if (child && !child.killed) child.kill('SIGTERM')
        child = null
      }
      process.on('exit', stop)
      process.on('SIGINT', stop)
      process.on('SIGTERM', stop)
    },
  }
}
