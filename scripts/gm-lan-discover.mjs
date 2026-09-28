/**
 * LAN Open-Table discovery helpers for the interim GM host.
 *
 * Primary: UDP multicast + subnet broadcast query/advertise (fast, same Wi‑Fi).
 * Fallback: TCP /24 probe of peer :PDS_GM_WS_PORT /sessions (slow; kept as safety net).
 *
 * Browsers cannot scan subnets; Join Session calls GET /discover on the local
 * interim host, which runs this plane and stamps peer host/port for connect.
 */

import dgram from 'node:dgram'
import { networkInterfaces } from 'node:os'

export const DISCOVER_MSG_AD = 'pds-gm-session-ad'
export const DISCOVER_MSG_QUERY = 'pds-gm-discover-query'
export const DISCOVER_PROTOCOL_V = 1

export const DEFAULT_WS_PORT = Number(process.env.PDS_GM_WS_PORT || 8765)
export const DEFAULT_UDP_PORT = Number(process.env.PDS_GM_DISCOVER_UDP_PORT || 8766)
export const MULTICAST_ADDR = process.env.PDS_GM_DISCOVER_MCAST || '239.255.90.65'

const DISCOVER_CACHE_MS = Number(process.env.PDS_GM_DISCOVER_CACHE_MS || 2000)
const DISCOVER_EMPTY_CACHE_MS = Number(
  process.env.PDS_GM_DISCOVER_EMPTY_CACHE_MS || 750,
)
const DISCOVER_TIMEOUT_MS = Number(process.env.PDS_GM_DISCOVER_TIMEOUT_MS || 120)
const DISCOVER_CONCURRENCY = Number(process.env.PDS_GM_DISCOVER_CONCURRENCY || 48)
const UDP_LISTEN_MS = Number(process.env.PDS_GM_DISCOVER_UDP_MS || 450)
const BEACON_INTERVAL_MS = Number(process.env.PDS_GM_BEACON_INTERVAL_MS || 1500)

/** @param {string | number | undefined} family */
export function isIpv4Family(family) {
  return family === 'IPv4' || family === 4
}

export function lanAddresses() {
  const out = []
  const nets = networkInterfaces()
  for (const rows of Object.values(nets)) {
    if (!rows) continue
    for (const row of rows) {
      if (isIpv4Family(row.family) && !row.internal) out.push(row.address)
    }
  }
  return out
}

/**
 * IPv4 LAN interfaces with CIDR (for peer probe + broadcast).
 * @returns {{ address: string, cidr: string, prefix: number, broadcast: string }[]}
 */
export function lanIpv4Cidrs() {
  const out = []
  const nets = networkInterfaces()
  for (const rows of Object.values(nets)) {
    if (!rows) continue
    for (const row of rows) {
      if (!isIpv4Family(row.family) || row.internal || !row.cidr) continue
      const prefix = Number(row.cidr.split('/')[1])
      if (!Number.isFinite(prefix)) continue
      const broadcast = broadcastForCidr(row.cidr)
      if (!broadcast) continue
      out.push({
        address: row.address,
        cidr: row.cidr,
        prefix,
        broadcast,
      })
    }
  }
  return out
}

/**
 * @param {string} cidr
 * @returns {string | null}
 */
export function broadcastForCidr(cidr) {
  const [base, prefixStr] = String(cidr).split('/')
  const prefix = Number(prefixStr)
  const parts = base?.split('.').map((x) => Number(x))
  if (
    !parts ||
    parts.length !== 4 ||
    parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255) ||
    !Number.isFinite(prefix) ||
    prefix < 0 ||
    prefix > 30
  ) {
    return null
  }
  const ipNum =
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const broadcastNum = (ipNum & mask) | (~mask >>> 0)
  return [
    (broadcastNum >>> 24) & 255,
    (broadcastNum >>> 16) & 255,
    (broadcastNum >>> 8) & 255,
    broadcastNum & 255,
  ].join('.')
}

/**
 * Enumerate usable host IPs in a CIDR. Home Wi‑Fi sized: /23–/30.
 * (/23 included — some consumer APs report 512-host masks.)
 * @param {string} cidr
 * @param {{ exclude?: Iterable<string>, maxHosts?: number }} [opts]
 * @returns {string[]}
 */
export function hostsInCidr(cidr, opts = {}) {
  const exclude = new Set(opts.exclude ?? [])
  const maxHosts = opts.maxHosts ?? 512
  const [base, prefixStr] = String(cidr).split('/')
  const prefix = Number(prefixStr)
  if (!base || !Number.isFinite(prefix) || prefix < 23 || prefix > 30) {
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

/**
 * @param {Iterable<{ host?: import('ws').WebSocket | null, campaignName: string, campaignId: string, playSessionId: string, joinToken: string, shortCode: string }>} rooms
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
 * @param {SessionAdLike[]} sessions
 * @param {string} host
 * @param {number} port
 */
export function stampSessionHosts(sessions, host, port) {
  return sessions.map((row) => ({
    ...row,
    host,
    port,
  }))
}

/**
 * @typedef {{
 *   campaignName: string,
 *   campaignId: string,
 *   playSessionId: string,
 *   joinToken: string,
 *   shortCode: string,
 *   host?: string,
 *   port?: number,
 * }} SessionAdLike
 */

/**
 * @param {SessionAdLike[]} local
 * @param {SessionAdLike[]} remote
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
 * @param {unknown} body
 * @param {string} fallbackHost
 * @param {number} fallbackPort
 * @returns {SessionAdLike[]}
 */
export function sessionsFromPeerBody(body, fallbackHost, fallbackPort) {
  const rows = Array.isArray(body?.sessions) ? body.sessions : []
  const peerPort =
    typeof body?.port === 'number' && Number.isFinite(body.port)
      ? body.port
      : fallbackPort
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
    fallbackHost,
    peerPort,
  )
}

/**
 * Probe one peer's local-only /sessions (never /discover — avoids amplification).
 * @param {string} ip
 * @param {number} port
 * @param {number} timeoutMs
 */
export async function fetchPeerLocalSessions(
  ip,
  port,
  timeoutMs = DISCOVER_TIMEOUT_MS,
) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`http://${ip}:${port}/sessions`, {
      signal: ctrl.signal,
    })
    if (!res.ok) return []
    const body = await res.json()
    return sessionsFromPeerBody(body, ip, port)
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}

/**
 * @param {string[]} hosts
 * @param {number} port
 * @param {{ concurrency?: number, timeoutMs?: number, earlyExit?: boolean, deadlineMs?: number }} [opts]
 */
export async function probeLanHosts(hosts, port, opts = {}) {
  const concurrency = opts.concurrency ?? DISCOVER_CONCURRENCY
  const timeoutMs = opts.timeoutMs ?? DISCOVER_TIMEOUT_MS
  const earlyExit = opts.earlyExit !== false
  const deadline =
    typeof opts.deadlineMs === 'number' ? Date.now() + opts.deadlineMs : null
  const remote = []
  let i = 0
  let stop = false
  async function worker() {
    while (!stop && i < hosts.length) {
      if (deadline != null && Date.now() >= deadline) {
        stop = true
        break
      }
      const idx = i++
      const ip = hosts[idx]
      const rows = await fetchPeerLocalSessions(ip, port, timeoutMs)
      if (rows.length) {
        remote.push(...rows)
        if (earlyExit) stop = true
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, hosts.length)) },
    () => worker(),
  )
  await Promise.all(workers)
  return remote
}

/**
 * Parse a UDP discovery datagram into stamped session ads.
 * @param {Buffer | string} msg
 * @param {string} rinfoAddress
 * @returns {SessionAdLike[]}
 */
export function parseDiscoverDatagram(msg, rinfoAddress) {
  let row
  try {
    row = JSON.parse(String(msg))
  } catch {
    return []
  }
  if (!row || typeof row !== 'object') return []
  if (row.v !== DISCOVER_PROTOCOL_V) return []
  if (row.t !== DISCOVER_MSG_AD) return []
  const host =
    typeof row.host === 'string' && row.host.trim()
      ? row.host.trim()
      : rinfoAddress
  const port =
    typeof row.port === 'number' && Number.isFinite(row.port)
      ? row.port
      : DEFAULT_WS_PORT
  return sessionsFromPeerBody(row, host, port)
}

/**
 * Build candidate TCP probe list: prefer same /24 as primary iface, include /23.
 * @param {number} [_port]
 */
export function buildTcpProbeCandidates(_port) {
  const self = new Set(lanAddresses())
  const candidates = []
  const seen = new Set()
  const ifaces = lanIpv4Cidrs()
    // Prefer tighter home masks first (/24–/30 before /23).
    .filter((iface) => iface.prefix >= 23 && iface.prefix <= 30)
    .sort((a, b) => b.prefix - a.prefix)
  for (const iface of ifaces) {
    for (const ip of hostsInCidr(iface.cidr, { exclude: self })) {
      if (seen.has(ip)) continue
      seen.add(ip)
      candidates.push(ip)
    }
  }
  return candidates
}

/** @type {{ at: number, port: number, sessions: SessionAdLike[], empty: boolean } | null} */
let discoverCache = null

export function clearDiscoverCache() {
  discoverCache = null
}

/**
 * UDP query/listen for Open Table ads on the LAN.
 * Binds an ephemeral port so replies are not lost when the local beacon
 * already owns the well-known discovery port.
 * @param {{
 *   udpPort?: number,
 *   listenMs?: number,
 *   multicastAddr?: string,
 *   getLocalSessions?: () => SessionAdLike[],
 *   tcpPort?: number,
 * }} [opts]
 * @returns {Promise<SessionAdLike[]>}
 */
export function udpBrowseOpenSessions(opts = {}) {
  const targetPort = opts.udpPort ?? DEFAULT_UDP_PORT
  const listenMs = opts.listenMs ?? UDP_LISTEN_MS
  const multicastAddr = opts.multicastAddr ?? MULTICAST_ADDR

  return new Promise((resolve) => {
    /** @type {Map<string, SessionAdLike>} */
    const byToken = new Map()
    let settled = false
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })

    const finish = () => {
      if (settled) return
      settled = true
      try {
        sock.close()
      } catch {
        /* ignore */
      }
      resolve([...byToken.values()])
    }

    sock.on('error', () => finish())
    sock.on('message', (buf, rinfo) => {
      for (const row of parseDiscoverDatagram(buf, rinfo.address)) {
        if (row.joinToken) byToken.set(row.joinToken, row)
      }
    })

    // Ephemeral bind — do not compete with the local beacon on targetPort.
    sock.bind(0, () => {
      try {
        sock.setBroadcast(true)
      } catch {
        /* ignore */
      }

      const query = Buffer.from(
        JSON.stringify({ t: DISCOVER_MSG_QUERY, v: DISCOVER_PROTOCOL_V }),
      )
      try {
        sock.send(query, targetPort, multicastAddr)
      } catch {
        /* ignore */
      }
      for (const iface of lanIpv4Cidrs()) {
        try {
          sock.send(query, targetPort, iface.broadcast)
        } catch {
          /* ignore */
        }
      }
      try {
        sock.send(query, targetPort, '127.0.0.1')
      } catch {
        /* ignore */
      }

      setTimeout(finish, listenMs)
    })
  })
}

/**
 * Persistent UDP beacon + query responder owned by one interim host process.
 * @param {{
 *   tcpPort: number,
 *   udpPort?: number,
 *   getSessions: () => SessionAdLike[],
 *   multicastAddr?: string,
 *   beaconIntervalMs?: number,
 * }} opts
 */
export function createLanDiscoveryBeacon(opts) {
  const udpPort = opts.udpPort ?? DEFAULT_UDP_PORT
  const multicastAddr = opts.multicastAddr ?? MULTICAST_ADDR
  const beaconIntervalMs = opts.beaconIntervalMs ?? BEACON_INTERVAL_MS
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  let timer = null
  let started = false

  const buildPayload = () => {
    const sessions = opts.getSessions()
    if (!sessions.length) return null
    const lans = lanAddresses()
    return Buffer.from(
      JSON.stringify({
        t: DISCOVER_MSG_AD,
        v: DISCOVER_PROTOCOL_V,
        port: opts.tcpPort,
        host: lans[0] ?? '127.0.0.1',
        lanAddresses: lans,
        sessions: sessions.map(({ host: _h, port: _p, ...rest }) => rest),
      }),
    )
  }

  const emit = () => {
    const payload = buildPayload()
    if (!payload) return
    try {
      sock.send(payload, udpPort, multicastAddr)
    } catch {
      /* ignore */
    }
    for (const iface of lanIpv4Cidrs()) {
      try {
        sock.send(payload, udpPort, iface.broadcast)
      } catch {
        /* ignore */
      }
    }
    try {
      sock.send(payload, udpPort, '127.0.0.1')
    } catch {
      /* ignore */
    }
  }

  const onMessage = (buf, rinfo) => {
    let row
    try {
      row = JSON.parse(String(buf))
    } catch {
      return
    }
    if (!row || row.v !== DISCOVER_PROTOCOL_V) return
    if (row.t !== DISCOVER_MSG_QUERY) return
    const payload = buildPayload()
    if (!payload) return
    try {
      sock.send(payload, rinfo.port, rinfo.address)
    } catch {
      /* ignore */
    }
  }

  return {
    get udpPort() {
      return udpPort
    },
    start: () =>
      new Promise((resolve, reject) => {
        if (started) {
          resolve(undefined)
          return
        }
        sock.once('error', reject)
        sock.on('message', onMessage)
        sock.bind(udpPort, () => {
          sock.off('error', reject)
          try {
            sock.setBroadcast(true)
            sock.setMulticastTTL(1)
            sock.setMulticastLoopback(true)
          } catch {
            /* ignore */
          }
          const ifaces = lanAddresses()
          if (ifaces.length === 0) {
            try {
              sock.addMembership(multicastAddr)
            } catch {
              /* ignore */
            }
          } else {
            for (const iface of ifaces) {
              try {
                sock.addMembership(multicastAddr, iface)
              } catch {
                /* ignore */
              }
            }
          }
          started = true
          timer = setInterval(emit, beaconIntervalMs)
          // Immediate advertise so a player who opens Join right after Open Table wins.
          emit()
          resolve(undefined)
        })
      }),
    /** Call when rooms change so ads refresh without waiting for interval. */
    poke: () => {
      if (started) emit()
    },
    /**
     * Query peers via ephemeral UDP socket (does not re-bind the beacon port).
     * @param {number} [listenMs]
     * @returns {Promise<SessionAdLike[]>}
     */
    browse: (listenMs = UDP_LISTEN_MS) => {
      const localTokens = new Set(
        opts.getSessions().map((s) => s.joinToken).filter(Boolean),
      )
      return udpBrowseOpenSessions({
        udpPort,
        listenMs,
        multicastAddr,
        tcpPort: opts.tcpPort,
      }).then((rows) =>
        rows.filter((row) => row.joinToken && !localTokens.has(row.joinToken)),
      )
    },
    stop: () =>
      new Promise((resolve) => {
        if (timer) {
          clearInterval(timer)
          timer = null
        }
        if (!started) {
          resolve(undefined)
          return
        }
        started = false
        try {
          sock.close(() => resolve(undefined))
        } catch {
          resolve(undefined)
        }
      }),
  }
}

/**
 * Full peer discovery: UDP first (fast), TCP /24(+ /23) fallback with early exit.
 * @param {number} port TCP interim port to connect peers on
 * @param {{
 *   cacheMs?: number,
 *   emptyCacheMs?: number,
 *   now?: number,
 *   skipCache?: boolean,
 *   udpPort?: number,
 *   udpListenMs?: number,
 *   skipUdp?: boolean,
 *   skipTcp?: boolean,
 *   tcpDeadlineMs?: number,
 *   getLocalSessions?: () => SessionAdLike[],
 *   udpBrowse?: (listenMs?: number) => Promise<SessionAdLike[]>,
 * }} [opts]
 */
export async function discoverLanPeerSessions(port, opts = {}) {
  const cacheMs = opts.cacheMs ?? DISCOVER_CACHE_MS
  const emptyCacheMs = opts.emptyCacheMs ?? DISCOVER_EMPTY_CACHE_MS
  const now = opts.now ?? Date.now()
  if (
    !opts.skipCache &&
    discoverCache &&
    discoverCache.port === port &&
    now - discoverCache.at <
      (discoverCache.empty ? emptyCacheMs : cacheMs)
  ) {
    return discoverCache.sessions
  }

  /** @type {SessionAdLike[]} */
  let remote = []

  if (!opts.skipUdp) {
    const listenMs = opts.udpListenMs ?? UDP_LISTEN_MS
    if (typeof opts.udpBrowse === 'function') {
      remote = await opts.udpBrowse(listenMs)
    } else {
      remote = await udpBrowseOpenSessions({
        udpPort: opts.udpPort ?? DEFAULT_UDP_PORT,
        listenMs,
        tcpPort: port,
        getLocalSessions: opts.getLocalSessions,
      })
    }
  }

  if (!remote.length && !opts.skipTcp) {
    const candidates = buildTcpProbeCandidates(port)
    remote = await probeLanHosts(candidates, port, {
      earlyExit: true,
      deadlineMs: opts.tcpDeadlineMs ?? 3500,
    })
  }

  discoverCache = {
    at: now,
    port,
    sessions: remote,
    empty: remote.length === 0,
  }
  return remote
}
