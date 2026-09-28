/**
 * Browser-visible LAN IPv4 hints for Join Session discovery.
 *
 * The interim Node sidecar may not share the browser's network view (WSL,
 * Docker Desktop, VPN split-tunnel). Advanced IP join uses the browser stack
 * and succeeds; browse must use the same reachability plane. WebRTC ICE
 * candidates expose the browser's private IPv4 addresses so /discover and the
 * in-browser TCP fallback can probe the correct /24.
 */

const IPV4_RE = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/g

function isPrivateLanIpv4(ip: string): boolean {
  const parts = ip.split('.').map((x) => Number(x))
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)
  ) {
    return false
  }
  const [a, b] = parts
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

/** /24 network string for an IPv4 address (e.g. 192.168.4.87 → 192.168.4.0/24). */
export function slash24ContainingIp(ip: string): string | null {
  const parts = ip.split('.').map((x) => Number(x))
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)
  ) {
    return null
  }
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
}

/** Hosts in a /24 excluding `exclude` (and network/broadcast). */
export function hostsInSlash24(
  cidrOrIp: string,
  exclude: Iterable<string> = [],
): string[] {
  const skip = new Set(exclude)
  const base = cidrOrIp.includes('/')
    ? cidrOrIp.split('/')[0]
    : cidrOrIp
  const parts = base.split('.').map((x) => Number(x))
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)
  ) {
    return []
  }
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`
  const out: string[] = []
  for (let d = 1; d <= 254; d++) {
    const ip = `${prefix}.${d}`
    if (!skip.has(ip)) out.push(ip)
  }
  return out
}

/**
 * Detect private IPv4 addresses visible to the browser via WebRTC ICE.
 * Returns [] when WebRTC is unavailable or times out.
 */
export async function detectBrowserLanIpv4s(
  timeoutMs = 600,
): Promise<string[]> {
  if (typeof RTCPeerConnection === 'undefined') return []
  const ips = new Set<string>()
  const pc = new RTCPeerConnection({ iceServers: [] })
  try {
    pc.createDataChannel('pds-lan-hint')
    const gathering = new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), timeoutMs)
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) {
          clearTimeout(timer)
          resolve()
          return
        }
        const blob = ev.candidate.candidate || ''
        for (const match of blob.matchAll(IPV4_RE)) {
          const ip = match[1]
          if (ip && isPrivateLanIpv4(ip)) ips.add(ip)
        }
      }
    })
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await gathering
  } catch {
    /* WebRTC blocked / unsupported */
  } finally {
    try {
      pc.close()
    } catch {
      /* ignore */
    }
  }
  return [...ips]
}

export type BrowserProbeOpts = {
  lanHints: string[]
  port?: number
  /** Soft deadline for the whole scan (ms). */
  deadlineMs?: number
  concurrency?: number
  perHostTimeoutMs?: number
  /** Injected fetch for tests. */
  fetchImpl?: typeof fetch
}

/**
 * Browser-side TCP probe of /sessions on the /24(s) around lanHints.
 * Same reachability plane as Advanced IP (browser → GM:8765). Early-exits
 * when any open table is found.
 */
export async function browserProbeLanSessions(
  opts: BrowserProbeOpts,
): Promise<
  Array<{
    campaignName: string
    campaignId: string
    playSessionId: string
    joinToken: string
    shortCode: string
    host: string
    port: number
  }>
> {
  const port = opts.port ?? 8765
  const deadlineMs = opts.deadlineMs ?? 2500
  const concurrency = opts.concurrency ?? 32
  const perHostTimeoutMs = opts.perHostTimeoutMs ?? 200
  const fetchImpl = opts.fetchImpl ?? fetch
  const self = new Set(opts.lanHints)
  const candidates: string[] = []
  const seen = new Set<string>()
  for (const hint of opts.lanHints) {
    const cidr = slash24ContainingIp(hint)
    if (!cidr) continue
    for (const ip of hostsInSlash24(cidr, self)) {
      if (seen.has(ip)) continue
      seen.add(ip)
      candidates.push(ip)
    }
  }
  if (candidates.length === 0) return []

  const found: Array<{
    campaignName: string
    campaignId: string
    playSessionId: string
    joinToken: string
    shortCode: string
    host: string
    port: number
  }> = []
  const deadline = Date.now() + deadlineMs
  let idx = 0
  let stop = false

  async function worker() {
    while (!stop && idx < candidates.length) {
      if (Date.now() >= deadline) {
        stop = true
        break
      }
      const ip = candidates[idx++]
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), perHostTimeoutMs)
      try {
        const res = await fetchImpl(`http://${ip}:${port}/sessions`, {
          signal: ctrl.signal,
        })
        if (!res.ok) continue
        const body: unknown = await res.json()
        if (body == null || typeof body !== 'object') continue
        const sessions = Array.isArray((body as { sessions?: unknown }).sessions)
          ? (body as { sessions: unknown[] }).sessions
          : []
        const peerPort =
          typeof (body as { port?: unknown }).port === 'number'
            ? ((body as { port: number }).port)
            : port
        for (const row of sessions) {
          if (row == null || typeof row !== 'object') continue
          const r = row as Record<string, unknown>
          if (
            typeof r.campaignName !== 'string' ||
            typeof r.campaignId !== 'string' ||
            typeof r.playSessionId !== 'string' ||
            typeof r.joinToken !== 'string' ||
            typeof r.shortCode !== 'string'
          ) {
            continue
          }
          found.push({
            campaignName: r.campaignName,
            campaignId: r.campaignId,
            playSessionId: r.playSessionId,
            joinToken: r.joinToken,
            shortCode: r.shortCode,
            host: ip,
            port: peerPort,
          })
          stop = true
        }
      } catch {
        /* unreachable / abort */
      } finally {
        clearTimeout(t)
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, candidates.length)) },
      () => worker(),
    ),
  )
  return found
}
