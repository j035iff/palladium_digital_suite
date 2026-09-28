/**
 * Vite plugin: auto-start interim GM WS relay during `vite` / `vite preview`
 * so both GM Open Table and player Join Session browse have a local sidecar.
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
  let stopping = false
  let lifecycleAttached = false
  /** @type {ReturnType<typeof setTimeout> | null} */
  let restartTimer = null

  const stopChild = () => {
    stopping = true
    if (restartTimer) {
      clearTimeout(restartTimer)
      restartTimer = null
    }
    if (child && !child.killed) child.kill('SIGTERM')
    child = null
  }

  const startChild = () => {
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
    stopping = false
    const script = join(root, 'scripts/gm-interim-ws-host.mjs')
    child = spawn(process.execPath, [script], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    })
    child.on('exit', (code) => {
      child = null
      if (stopping) return
      if (code && code !== 0) {
        console.warn(
          `[gm-interim-ws] exited with code ${code} — retrying in 1s (Join Session browse needs this host)`,
        )
      } else {
        console.warn(
          '[gm-interim-ws] exited — restarting so player Join Session keeps discovery alive',
        )
      }
      if (restartTimer) clearTimeout(restartTimer)
      restartTimer = setTimeout(() => {
        restartTimer = null
        startChild()
      }, 1000)
    })
  }

  const attachLifecycle = () => {
    if (lifecycleAttached) {
      startChild()
      return
    }
    lifecycleAttached = true
    startChild()
    const onStop = () => stopChild()
    process.once('exit', onStop)
    process.once('SIGINT', onStop)
    process.once('SIGTERM', onStop)
  }

  return {
    name: 'gm-interim-ws-host',
    apply: 'serve',
    configureServer() {
      attachLifecycle()
    },
    configurePreviewServer() {
      attachLifecycle()
    },
  }
}
