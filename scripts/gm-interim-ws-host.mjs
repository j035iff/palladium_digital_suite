/**
 * Interim same-WiFi WebSocket relay for GM Hub client join.
 * Not the production desktop sidecar — Radical Visibility copy in the UI says so.
 *
 * Usage: node scripts/gm-interim-ws-host.mjs
 * Health: GET http://0.0.0.0:8765/health
 * Sessions: GET http://0.0.0.0:8765/sessions  (local open sittings only)
 * Discover: GET http://0.0.0.0:8765/discover (local + LAN peer sittings)
 * Default TCP port: 8765 (override with PDS_GM_WS_PORT)
 * Discovery UDP port: 8766 (override with PDS_GM_DISCOVER_UDP_PORT)
 *
 * Browsers cannot subnet-scan. Each device's interim host:
 *   1) UDP multicast + subnet-broadcast query/advertise (primary)
 *   2) TCP /24(+ /23) peer probe of /sessions (fallback)
 * so Join Session lists a GM Open Table without typing an IP when both
 * machines run the app on the same Wi‑Fi. Advanced IP is failure-mode only.
 */

import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import {
  advertiseOpenSessions,
  clearDiscoverCache,
  createLanDiscoveryBeacon,
  DEFAULT_UDP_PORT,
  DEFAULT_WS_PORT,
  discoverLanPeerSessions,
  fetchPeerLocalSessions,
  hostsInCidr,
  lanAddresses,
  lanIpv4Cidrs,
  mergeLocalAndRemoteSessions,
  probeLanHosts,
  stampSessionHosts,
  udpBrowseOpenSessions,
  broadcastForCidr,
  buildTcpProbeCandidates,
  isIpv4Family,
  parseDiscoverDatagram,
  sessionsFromPeerBody,
  DISCOVER_MSG_AD,
  DISCOVER_MSG_QUERY,
  DISCOVER_PROTOCOL_V,
} from './gm-lan-discover.mjs'

export {
  advertiseOpenSessions,
  clearDiscoverCache,
  createLanDiscoveryBeacon,
  DEFAULT_UDP_PORT,
  DEFAULT_WS_PORT,
  discoverLanPeerSessions,
  fetchPeerLocalSessions,
  hostsInCidr,
  lanAddresses,
  lanIpv4Cidrs,
  mergeLocalAndRemoteSessions,
  probeLanHosts,
  stampSessionHosts,
  udpBrowseOpenSessions,
  broadcastForCidr,
  buildTcpProbeCandidates,
  isIpv4Family,
  parseDiscoverDatagram,
  sessionsFromPeerBody,
  DISCOVER_MSG_AD,
  DISCOVER_MSG_QUERY,
  DISCOVER_PROTOCOL_V,
}

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

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj))
}

/**
 * @param {{ port?: number, udpPort?: number }} [opts]
 */
export function createInterimGmHost(opts = {}) {
  let PORT = opts.port ?? DEFAULT_WS_PORT
  const UDP_PORT = opts.udpPort ?? DEFAULT_UDP_PORT

  /** @type {Map<string, Room>} */
  const roomsByToken = new Map()
  /** @type {Map<string, Room>} */
  const roomsByCode = new Map()
  /** @type {WeakMap<import('ws').WebSocket, { role: 'host' | 'client', room: Room, peerId: string, deviceId?: string }>} */
  const meta = new WeakMap()

  const makeBeacon = () =>
    createLanDiscoveryBeacon({
      tcpPort: PORT,
      udpPort: UDP_PORT,
      getSessions: () => {
        const lans = lanAddresses()
        const hint = lans[0] ?? '127.0.0.1'
        return stampSessionHosts(
          advertiseOpenSessions(roomsByToken.values()),
          hint,
          PORT,
        )
      },
    })
  let liveBeacon = makeBeacon()

  function detachSocket(ws) {
    const info = meta.get(ws)
    if (!info) return
    const { room, role, peerId } = info
    if (role === 'host') {
      room.host = null
      liveBeacon.poke()
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
    liveBeacon.poke()
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
        udpPort: UDP_PORT,
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
        udpPort: UDP_PORT,
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
          const remote = await discoverLanPeerSessions(PORT, {
            udpPort: UDP_PORT,
            getLocalSessions: () =>
              advertiseOpenSessions(roomsByToken.values()),
            udpBrowse: (ms) => liveBeacon.browse(ms),
            // Prefer UDP; keep TCP fallback short so /discover returns inside client budget.
            tcpDeadlineMs: 2500,
          })
          const sessions = mergeLocalAndRemoteSessions(local, remote)
          const body = JSON.stringify({
            ok: true,
            interim: true,
            discover: true,
            port: PORT,
            udpPort: UDP_PORT,
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
            udpPort: UDP_PORT,
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
        liveBeacon.poke()
        send(ws, {
          op: 'registered',
          role: 'host',
          lanAddresses: lanAddresses(),
          port: PORT,
          udpPort: UDP_PORT,
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
    get udpPort() {
      return UDP_PORT
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
          // Recreate beacon with resolved TCP port (port:0 → ephemeral).
          void liveBeacon.stop().then(() => {
            liveBeacon = makeBeacon()
            liveBeacon.start().then(() => resolve(undefined)).catch(reject)
          })
        })
      }),
    close: () =>
      new Promise((resolve, reject) => {
        void liveBeacon.stop().finally(() => {
          for (const client of wss.clients) client.close()
          wss.close((err) => {
            if (err) {
              reject(err)
              return
            }
            server.close((err2) => (err2 ? reject(err2) : resolve(undefined)))
          })
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
        `[gm-interim-ws] Interim proof host — production desktop sidecar is not this process.`,
      )
      console.log(
        `[gm-interim-ws] Advertise: GET http://127.0.0.1:${host.port}/sessions (local)`,
      )
      console.log(
        `[gm-interim-ws] Discover:  GET http://127.0.0.1:${host.port}/discover (UDP beacon + TCP fallback)`,
      )
      console.log(
        `[gm-interim-ws] Discovery UDP ${host.udpPort} (multicast ${process.env.PDS_GM_DISCOVER_MCAST || '239.255.90.65'} + subnet broadcast)`,
      )
    })
    .catch((err) => {
      console.error('[gm-interim-ws] failed to listen', err)
      process.exit(1)
    })
}
