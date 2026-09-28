/**
 * Interim same-WiFi WebSocket relay for GM Hub client join.
 * Not the production desktop sidecar — Radical Visibility copy in the UI says so.
 *
 * Usage: node scripts/gm-interim-ws-host.mjs
 * Health: GET http://0.0.0.0:8765/health
 * Sessions: GET http://0.0.0.0:8765/sessions  (local open sittings only)
 * Discover: GET http://0.0.0.0:8765/discover (local + LAN peer sittings)
 * Default port: 8765 (override with PDS_GM_WS_PORT)
 *
 * Browsers cannot subnet-scan. Each device's interim host probes its LAN /24
 * for other :8765 peers so Join Session can list a GM Open Table without
 * typing an IP when both machines run the app on the same Wi‑Fi.
 */

import http from 'node:http'
import path from 'node:path'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const DEFAULT_PORT = Number(process.env.PDS_GM_WS_PORT || 8765)
const DISCOVER_CACHE_MS = Number(process.env.PDS_GM_DISCOVER_CACHE_MS || 4000)
const DISCOVER_TIMEOUT_MS = Number(process.env.PDS_GM_DISCOVER_TIMEOUT_MS || 150)
const DISCOVER_CONCURRENCY = Number(process.env.PDS_GM_DISCOVER_CONCURRENCY || 32)

/**
 * @typedef {{
 *   campaignId: string,
 *   campaignName: string,
 *   playSessionId: string,
 *   joinToken: string,
 *   shortCode: string,
 *   host: import('ws').WebSocket | null,
 *   clients: Map<string, import('ws').WebSocket>
 * }} Room
 */

/**
 * @typedef {{
 *   campaignName: string,
 *   campaignId: string,
 *   playSessionId: string,
 *   joinToken: string,
 *   shortCode: string,
 *   host?: string,
 *   port?: number,
 * }} SessionAd
 */

export function lanAddresses() {
  const out = []
  const nets = networkInterfaces()
  for (const rows of Object.values(nets)) {
    if (!rows) continue
    for (const row of rows) {
      if (row.family === 'IPv4' && !row.internal) out.push(row.address)
    }
  }
  return out
}

/**
 * IPv4 LAN interfaces with CIDR (for peer probe). Skips internal / loopback.
 * @returns {{ address: string, cidr: string, prefix: number }[]}
 */
export function lanIpv4Cidrs() {
  const out = []
  const nets = networkInterfaces()
  for (const rows of Object.values(nets)) {
    if (!rows) continue
    for (const row of rows) {
      if (row.family !== 'IPv4' || row.internal || !row.cidr) continue
      const prefix = Number(row.cidr.split('/')[1])
      if (!Number.isFinite(prefix)) continue
      out.push({ address: row.address, cidr: row.cidr, prefix })
    }
  }
  return out
}

/**
 * Enumerate usable host IPs in a CIDR. Only /24–/30 (home Wi‑Fi sized).
 * @param {string} cidr
 * @param {{ exclude?: Iterable<string>, maxHosts?: number }} [opts]
 * @returns {string[]}
 */
export function hostsInCidr(cidr, opts = {}) {
  const exclude = new Set(opts.exclude ?? [])
  const maxHosts = opts.maxHosts ?? 256
  const [base, prefixStr] = String(cidr).split('/')
  const prefix = Number(prefixStr)
  if (!base || !Number.isFinite(prefix) || prefix < 24 || prefix > 30) {
    return []
  }
  const parts = base.split('.').map((x) => Number(x))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return []
  }
  const ipNum =
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const network = (ipNum & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const hosts = []
  for (let n = network + 1; n < broadcast && hosts.length < maxHosts; n++) {
    const a = (n >>> 24) & 255
    const b = (n >>> 16) & 255
    const c = (n >>> 8) & 255
    const d = n & 255
    const ip = `${a}.${b}.${c}.${d}`
    if (!exclude.has(ip)) hosts.push(ip)
  }
  return hosts
}

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj))
}

/**
 * Build Join Session list DTOs for open rooms (host connected).
 * Display identity is campaignName only — no date/time fields.
 * @param {Iterable<Room>} rooms
 * @returns {SessionAd[]}
 */
export function advertiseOpenSessions(rooms) {
  const sessions = []
  for (const room of rooms) {
    if (!room.host) continue
    sessions.push({
      campaignName: room.campaignName,
      campaignId: room.campaignId,
      playSessionId: room.playSessionId,
      joinToken: room.joinToken,
      shortCode: room.shortCode,
    })
  }
  return sessions
}

/**
 * Stamp connect host/port on advertisement rows (required for remote peers).
 * @param {SessionAd[]} sessions
 * @param {string} host
 * @param {number} port
 * @returns {SessionAd[]}
 */
export function stampSessionHosts(sessions, host, port) {
  return sessions.map((row) => ({
    ...row,
    host,
    port,
  }))
}

/**
 * Merge local + remote ads; remote host wins for routing; dedupe by joinToken.
 * @param {SessionAd[]} local
 * @param {SessionAd[]} remote
 * @returns {SessionAd[]}
 */
export function mergeLocalAndRemoteSessions(local, remote) {
  const byToken = new Map()
  for (const row of local) {
    if (row.joinToken) byToken.set(row.joinToken, row)
  }
  for (const row of remote) {
    if (!row.joinToken) continue
    if (!byToken.has(row.joinToken)) byToken.set(row.joinToken, row)
  }
  return [...byToken.values()]
}

/**
 * Probe one peer's local-only /sessions (never /discover — avoids amplification).
 * @param {string} ip
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<SessionAd[]>}
 */
export async function fetchPeerLocalSessions(ip, port, timeoutMs = DISCOVER_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`http://${ip}:${port}/sessions`, {
      signal: ctrl.signal,
    })
    if (!res.ok) return []
    const body = await res.json()
    const rows = Array.isArray(body?.sessions) ? body.sessions : []
    const peerPort =
      typeof body?.port === 'number' && Number.isFinite(body.port)
        ? body.port
        : port
    return stampSessionHosts(
      rows.filter(
        (row) =>
          row &&
          typeof row.campaignName === 'string' &&
          typeof row.campaignId === 'string' &&
          typeof row.playSessionId === 'string' &&
          typeof row.joinToken === 'string' &&
          typeof row.shortCode === 'string',
      ),
      ip,
      peerPort,
    )
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}

/**
 * @param {string[]} hosts
 * @param {number} port
 * @param {{ concurrency?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<SessionAd[]>}
 */
export async function probeLanHosts(hosts, port, opts = {}) {
  const concurrency = opts.concurrency ?? DISCOVER_CONCURRENCY
  const timeoutMs = opts.timeoutMs ?? DISCOVER_TIMEOUT_MS
  const remote = []
  let i = 0
  async function worker() {
    while (i < hosts.length) {
      const idx = i++
      const ip = hosts[idx]
      const rows = await fetchPeerLocalSessions(ip, port, timeoutMs)
      if (rows.length) remote.push(...rows)
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, hosts.length)) },
    () => worker(),
  )
  await Promise.all(workers)
  return remote
}

/** @type {{ at: number, port: number, sessions: SessionAd[] } | null} */
let discoverCache = null

/**
 * Build candidate peer IPs from local LAN CIDRs, then probe /sessions.
 * Results cached briefly so Join Session polls stay light.
 * @param {number} port
 * @param {{ cacheMs?: number, now?: number, skipCache?: boolean }} [opts]
 * @returns {Promise<SessionAd[]>}
 */
export async function discoverLanPeerSessions(port, opts = {}) {
  const cacheMs = opts.cacheMs ?? DISCOVER_CACHE_MS
  const now = opts.now ?? Date.now()
  if (
    !opts.skipCache &&
    discoverCache &&
    discoverCache.port === port &&
    now - discoverCache.at < cacheMs
  ) {
    return discoverCache.sessions
  }

  const self = new Set(lanAddresses())
  const candidates = new Set()
  for (const iface of lanIpv4Cidrs()) {
    // Only home-sized subnets — skip huge clouds (/16 etc.)
    if (iface.prefix < 24 || iface.prefix > 30) continue
    for (const ip of hostsInCidr(iface.cidr, { exclude: self })) {
      candidates.add(ip)
    }
  }
  const remote = await probeLanHosts([...candidates], port)
  discoverCache = { at: now, port, sessions: remote }
  return remote
}

/** Test helper — clear discover cache between cases. */
export function clearDiscoverCache() {
  discoverCache = null
}

/**
 * @param {{ port?: number }} [opts]
 */
export function createInterimGmHost(opts = {}) {
  let PORT = opts.port ?? DEFAULT_PORT

  /** @type {Map<string, Room>} */
  const roomsByToken = new Map()
  /** @type {Map<string, Room>} */
  const roomsByCode = new Map()
  /** @type {WeakMap<import('ws').WebSocket, { role: 'host' | 'client', room: Room, peerId: string, deviceId?: string }>} */
  const meta = new WeakMap()

  function detachSocket(ws) {
    const info = meta.get(ws)
    if (!info) return
    const { room, role, peerId } = info
    if (role === 'host') {
      room.host = null
    } else {
      room.clients.delete(peerId)
      if (room.host) {
        send(room.host, {
          op: 'peer_change',
          peers: [...room.clients.keys()].map((id) => ({
            peerId: id,
            role: 'client',
          })),
        })
      }
    }
    meta.delete(ws)
  }

  function findRoom(token, code) {
    if (token && roomsByToken.has(token)) return roomsByToken.get(token)
    if (code) {
      const normalized = String(code).trim().toUpperCase()
      return roomsByCode.get(normalized) ?? null
    }
    return null
  }

  function unlistRoom(room) {
    roomsByToken.delete(room.joinToken)
    roomsByCode.delete(room.shortCode)
  }

  const server = http.createServer((req, res) => {
    const cors = {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'content-type',
      })
      res.end()
      return
    }
    if (req.url?.startsWith('/health')) {
      const body = JSON.stringify({
        ok: true,
        interim: true,
        port: PORT,
        lanAddresses: lanAddresses(),
        rooms: roomsByToken.size,
      })
      res.writeHead(200, cors)
      res.end(body)
      return
    }
    if (req.url?.startsWith('/sessions')) {
      // Local rooms only — peers must use this path so /discover cannot amplify.
      const body = JSON.stringify({
        ok: true,
        interim: true,
        port: PORT,
        lanAddresses: lanAddresses(),
        sessions: advertiseOpenSessions(roomsByToken.values()),
      })
      res.writeHead(200, cors)
      res.end(body)
      return
    }
    if (req.url?.startsWith('/discover')) {
      void (async () => {
        try {
          const lans = lanAddresses()
          const localHint = lans[0] ?? '127.0.0.1'
          const local = stampSessionHosts(
            advertiseOpenSessions(roomsByToken.values()),
            localHint,
            PORT,
          )
          const remote = await discoverLanPeerSessions(PORT)
          const sessions = mergeLocalAndRemoteSessions(local, remote)
          const body = JSON.stringify({
            ok: true,
            interim: true,
            discover: true,
            port: PORT,
            lanAddresses: lans,
            sessions,
          })
          res.writeHead(200, cors)
          res.end(body)
        } catch (err) {
          const body = JSON.stringify({
            ok: false,
            interim: true,
            discover: true,
            port: PORT,
            lanAddresses: lanAddresses(),
            sessions: stampSessionHosts(
              advertiseOpenSessions(roomsByToken.values()),
              lanAddresses()[0] ?? '127.0.0.1',
              PORT,
            ),
            reason:
              err instanceof Error
                ? err.message
                : 'LAN discover failed.',
          })
          res.writeHead(200, cors)
          res.end(body)
        }
      })()
      return
    }
    res.writeHead(404)
    res.end('Not found')
  })

  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      let row
      try {
        row = JSON.parse(String(data))
      } catch {
        return
      }
      if (!row || typeof row !== 'object') return

      if (row.op === 'register_host') {
        const joinToken = String(row.joinToken || '')
        const shortCode = String(row.shortCode || '').toUpperCase()
        const campaignId = String(row.campaignId || '')
        const campaignName = String(row.campaignName || '').trim()
        const playSessionId = String(row.playSessionId || '')
        if (
          !joinToken ||
          !shortCode ||
          !campaignId ||
          !campaignName ||
          !playSessionId
        ) {
          send(ws, { op: 'error', reason: 'Incomplete host registration.' })
          return
        }
        /** @type {Room} */
        const room = {
          campaignId,
          campaignName,
          playSessionId,
          joinToken,
          shortCode,
          host: ws,
          clients: new Map(),
        }
        roomsByToken.set(joinToken, room)
        roomsByCode.set(shortCode, room)
        meta.set(ws, { role: 'host', room, peerId: 'host' })
        send(ws, {
          op: 'registered',
          role: 'host',
          lanAddresses: lanAddresses(),
          port: PORT,
        })
        return
      }

      if (row.op === 'register_client') {
        const room = findRoom(row.joinToken, row.shortCode || row.code)
        if (!room || !room.host) {
          send(ws, {
            op: 'error',
            reason:
              'No open sitting for that code. Confirm the GM has Open Table (listen) running.',
          })
          return
        }
        const deviceId = String(row.deviceId || `anon_${Date.now()}`)
        const peerId = `client:${deviceId}`
        room.clients.set(peerId, ws)
        meta.set(ws, { role: 'client', room, peerId, deviceId })
        send(ws, {
          op: 'registered',
          role: 'client',
          campaignId: room.campaignId,
          playSessionId: room.playSessionId,
          joinToken: room.joinToken,
          shortCode: room.shortCode,
        })
        send(room.host, {
          op: 'peer_change',
          peers: [...room.clients.entries()].map(([id, _ws]) => ({
            peerId: id,
            role: 'client',
            deviceId: id.replace(/^client:/, ''),
          })),
        })
        return
      }

      const info = meta.get(ws)
      if (!info) return
      const { room, role, peerId } = info

      if (row.op === 'broadcast' && role === 'host') {
        for (const client of room.clients.values()) {
          send(client, {
            op: 'deliver',
            from: { peerId: 'host', role: 'host' },
            message: row.message,
          })
        }
        return
      }

      if (row.op === 'forward') {
        const to = row.to
        const fromPeer =
          row.from ||
          (role === 'host'
            ? { peerId: 'host', role: 'host' }
            : { peerId, role: 'client', deviceId: info.deviceId })
        if (to === 'host' || to === room.host) {
          if (room.host) {
            send(room.host, {
              op: 'deliver',
              from: fromPeer,
              message: row.message,
            })
          }
          return
        }
        if (typeof to === 'string') {
          const target = room.clients.get(to)
          if (target) {
            send(target, {
              op: 'deliver',
              from: fromPeer,
              message: row.message,
            })
          }
        }
      }
    })

    ws.on('close', () => {
      const info = meta.get(ws)
      if (info?.role === 'host') {
        const { room } = info
        for (const client of room.clients.values()) {
          send(client, {
            op: 'deliver',
            from: { peerId: 'host', role: 'host' },
            message: {
              v: 1,
              type: 'session.closed',
              sessionId: room.campaignId,
              sentAtMs: Date.now(),
              payload: {
                playSessionId: room.playSessionId,
                reason: 'Host disconnected.',
              },
            },
          })
          client.close()
        }
        unlistRoom(room)
      }
      detachSocket(ws)
    })
  })

  return {
    get port() {
      return PORT
    },
    server,
    wss,
    /** @returns {Room[]} */
    listRooms: () => [...roomsByToken.values()],
    listen: () =>
      new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(PORT, '0.0.0.0', () => {
          server.off('error', reject)
          const addr = server.address()
          if (addr && typeof addr !== 'string') PORT = addr.port
          resolve(undefined)
        })
      }),
    close: () =>
      new Promise((resolve, reject) => {
        for (const client of wss.clients) client.close()
        wss.close((err) => {
          if (err) {
            reject(err)
            return
          }
          server.close((err2) => (err2 ? reject(err2) : resolve(undefined)))
        })
      }),
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const host = createInterimGmHost()
  host
    .listen()
    .then(() => {
      const lans = lanAddresses()
      console.log(
        `[gm-interim-ws] listening on 0.0.0.0:${host.port} (LAN: ${lans.join(', ') || 'none'})`,
      )
      console.log(
        '[gm-interim-ws] Interim proof host — production desktop sidecar is not this process.',
      )
      console.log(
        `[gm-interim-ws] Advertise: GET http://127.0.0.1:${host.port}/sessions (local)`,
      )
      console.log(
        `[gm-interim-ws] Discover:  GET http://127.0.0.1:${host.port}/discover (local + LAN peers)`,
      )
      console.log(
        '[gm-interim-ws] Firewall: allow inbound TCP on this port from the Wi‑Fi LAN.',
      )
    })
    .catch((err) => {
      console.error('[gm-interim-ws] failed to listen', err)
      process.exit(1)
    })
}
