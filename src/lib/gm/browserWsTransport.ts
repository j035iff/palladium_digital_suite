/**
 * Browser WebSocket client talking to the interim (or future desktop) GM host relay.
 */

import type {
  GmTransport,
  GmTransportMessageHandler,
  GmTransportPeer,
} from './sessionTransport'
import type { GmJoinCredentials } from './sessionJoinCode'

export type WsRelayRole = 'host' | 'client'

export type BrowserWsRegistration = {
  role: WsRelayRole
  campaignId?: string
  playSessionId?: string
  joinToken?: string
  shortCode?: string
  lanAddresses?: string[]
  port?: number
}

export type CreateBrowserWsTransportOpts = {
  /** e.g. ws://192.168.1.10:8765 */
  url: string
  role: WsRelayRole
  host?: {
    campaignId: string
    playSessionId: string
    credentials: GmJoinCredentials
  }
  client?: {
    deviceId: string
    joinToken?: string
    shortCode?: string
  }
  onRegistered?: (info: BrowserWsRegistration) => void
  onRelayError?: (reason: string) => void
}

export function defaultInterimWsUrl(
  hostname =
    typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
): string {
  const host = hostname === 'localhost' ? '127.0.0.1' : hostname
  return `ws://${host}:8765`
}

export function interimWsHealthUrl(
  hostname =
    typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
): string {
  const host = hostname === 'localhost' ? '127.0.0.1' : hostname
  return `http://${host}:8765/health`
}

export async function probeInterimWsHost(
  hostname?: string,
  timeoutMs = 800,
): Promise<{
  ok: boolean
  lanAddresses: string[]
  port: number
}> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(interimWsHealthUrl(hostname), {
      signal: ctrl.signal,
    })
    if (!res.ok) return { ok: false, lanAddresses: [], port: 8765 }
    const body = (await res.json()) as {
      lanAddresses?: string[]
      port?: number
    }
    return {
      ok: true,
      lanAddresses: body.lanAddresses ?? [],
      port: body.port ?? 8765,
    }
  } catch {
    return { ok: false, lanAddresses: [], port: 8765 }
  } finally {
    clearTimeout(t)
  }
}

export function createBrowserWsTransport(
  opts: CreateBrowserWsTransportOpts,
): GmTransport {
  let socket: WebSocket | null = null
  const handlers = new Set<GmTransportMessageHandler>()
  const peerChange = new Set<(peers: GmTransportPeer[]) => void>()
  let started = false
  const selfPeer: GmTransportPeer = {
    peerId:
      opts.role === 'host'
        ? 'host'
        : `client:${opts.client?.deviceId ?? 'unknown'}`,
    role: opts.role,
    deviceId: opts.client?.deviceId,
  }

  const deliver = (from: GmTransportPeer, message: unknown) => {
    for (const h of handlers) h(from, message)
  }

  return {
    start: () =>
      new Promise((resolve, reject) => {
        if (started && socket?.readyState === WebSocket.OPEN) {
          resolve()
          return
        }
        socket = new WebSocket(opts.url)
        let settled = false
        socket.addEventListener('open', () => {
          started = true
          if (opts.role === 'host' && opts.host) {
            socket!.send(
              JSON.stringify({
                op: 'register_host',
                campaignId: opts.host.campaignId,
                playSessionId: opts.host.playSessionId,
                joinToken: opts.host.credentials.joinToken,
                shortCode: opts.host.credentials.shortCode,
              }),
            )
          } else if (opts.role === 'client' && opts.client) {
            socket!.send(
              JSON.stringify({
                op: 'register_client',
                deviceId: opts.client.deviceId,
                joinToken: opts.client.joinToken,
                shortCode: opts.client.shortCode,
              }),
            )
          }
          if (!settled) {
            settled = true
            resolve()
          }
        })
        socket.addEventListener('error', () => {
          if (!settled) {
            settled = true
            reject(new Error('WebSocket connection failed'))
          }
        })
        socket.addEventListener('message', (ev) => {
          let raw: unknown
          try {
            raw = JSON.parse(String(ev.data))
          } catch {
            return
          }
          if (raw == null || typeof raw !== 'object') return
          const row = raw as Record<string, unknown>
          if (row.op === 'registered') {
            opts.onRegistered?.({
              role: row.role as WsRelayRole,
              campaignId: row.campaignId as string | undefined,
              playSessionId: row.playSessionId as string | undefined,
              joinToken: row.joinToken as string | undefined,
              shortCode: row.shortCode as string | undefined,
              lanAddresses: row.lanAddresses as string[] | undefined,
              port: row.port as number | undefined,
            })
            return
          }
          if (row.op === 'error') {
            opts.onRelayError?.(String(row.reason ?? 'Relay error'))
            return
          }
          if (row.op === 'peer_change') {
            const peers = (row.peers as GmTransportPeer[]) ?? []
            for (const h of peerChange) h(peers)
            return
          }
          if (row.op === 'deliver') {
            const from = (row.from as GmTransportPeer) ?? {
              peerId: 'relay',
              role: 'relay' as const,
            }
            deliver(from, row.message)
          }
        })
        socket.addEventListener('close', () => {
          started = false
          for (const h of peerChange) h([])
        })
      }),
    stop: async () => {
      socket?.close()
      socket = null
      started = false
    },
    broadcast: (message) => {
      if (opts.role !== 'host' || !socket || socket.readyState !== WebSocket.OPEN)
        return
      socket.send(JSON.stringify({ op: 'broadcast', message }))
    },
    send: (peerId, message) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return
      socket.send(
        JSON.stringify({
          op: 'forward',
          to: peerId,
          message,
          from: selfPeer,
        }),
      )
    },
    onMessage: (handler) => {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    onPeerChange: (handler) => {
      peerChange.add(handler)
      return () => peerChange.delete(handler)
    },
  }
}
