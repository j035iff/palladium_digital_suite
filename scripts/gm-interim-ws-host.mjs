/**
 * Interim same-WiFi WebSocket relay for GM Hub client join.
 * Not the production desktop sidecar — Radical Visibility copy in the UI says so.
 *
 * Usage: node scripts/gm-interim-ws-host.mjs
 * Health: GET http://0.0.0.0:8765/health
 * Default port: 8765 (override with PDS_GM_WS_PORT)
 */

import http from 'node:http'
import { networkInterfaces } from 'node:os'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PDS_GM_WS_PORT || 8765)

/** @typedef {{ campaignId: string, playSessionId: string, joinToken: string, shortCode: string, host: import('ws').WebSocket | null, clients: Map<string, import('ws').WebSocket> }} Room */

/** @type {Map<string, Room>} */
const roomsByToken = new Map()
/** @type {Map<string, Room>} */
const roomsByCode = new Map()
/** @type {WeakMap<import('ws').WebSocket, { role: 'host' | 'client', room: Room, peerId: string, deviceId?: string }>} */
const meta = new WeakMap()

function lanAddresses() {
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

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj))
}

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

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/health')) {
    const body = JSON.stringify({
      ok: true,
      interim: true,
      port: PORT,
      lanAddresses: lanAddresses(),
      rooms: roomsByToken.size,
    })
    res.writeHead(200, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    })
    res.end(body)
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
      const playSessionId = String(row.playSessionId || '')
      if (!joinToken || !shortCode || !campaignId || !playSessionId) {
        send(ws, { op: 'error', reason: 'Incomplete host registration.' })
        return
      }
      /** @type {Room} */
      const room = {
        campaignId,
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
            'No open sitting for that code. Confirm the GM has Open Session + listen running.',
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
      roomsByToken.delete(room.joinToken)
      roomsByCode.delete(room.shortCode)
    }
    detachSocket(ws)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  const lans = lanAddresses()
  console.log(
    `[gm-interim-ws] listening on 0.0.0.0:${PORT} (LAN: ${lans.join(', ') || 'none'})`,
  )
  console.log(
    '[gm-interim-ws] Interim proof host — production desktop sidecar is not this process.',
  )
})
