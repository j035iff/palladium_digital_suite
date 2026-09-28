/**
 * LAN Join Session discovery — list open/advertised sittings from the interim
 * (or future desktop) GM host. Narrow interface so the sidecar can replace
 * advertisement without forking Join UI.
 *
 * Display identity for list rows is **campaignName only** (no date/time).
 * Routing fields (ids + token/code) stay on the DTO for connect; they are not
 * player-facing labels.
 *
 * Happy path: poll the **local** interim host `GET /discover` (never the
 * Advanced GM IP field). The sidecar UDP-beacons + TCP-probes; the client also
 * passes browser-visible LAN hints and falls back to an in-browser /24 probe
 * on the same TCP plane Advanced IP uses — so browse succeeds whenever a
 * direct TCP join to the GM would.
 */

import {
  browserProbeLanSessions,
  detectBrowserLanIpv4s,
} from './browserLanHints'

export type LanSessionAdvertisement = {
  /** Join Session button label — campaign name only. */
  campaignName: string
  campaignId: string
  playSessionId: string
  /** Room bind secret — not shown as the session title. */
  joinToken: string
  shortCode: string
  /** Hostname/IP used to reach the advertising host. */
  hostHint: string
  port: number
}

export type ListLanSessionsResult = {
  ok: boolean
  sessions: LanSessionAdvertisement[]
  lanAddresses: string[]
  port: number
  /** Why browse failed (Radical Visibility) — empty when ok. */
  reason: string | null
  /** True when response came from /discover (LAN peer probe). */
  discovered?: boolean
  /** True when the in-browser TCP fallback found the table. */
  browserProbed?: boolean
}

/** Hostname of the local interim sidecar for Join Session browse. */
export function localBrowseHost(
  hostname =
    typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
): string {
  return hostname === 'localhost' ? '127.0.0.1' : hostname
}

/** HTTP advertise URL on the interim host (CORS open like /health). Local rooms only. */
export function interimWsSessionsUrl(
  hostname =
    typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
  port = 8765,
): string {
  const host = localBrowseHost(hostname)
  return `http://${host}:${port}/sessions`
}

/** LAN browse URL — local rooms + peered Open Tables on the Wi‑Fi. */
export function interimWsDiscoverUrl(
  hostname =
    typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
  port = 8765,
  lanHints: string[] = [],
): string {
  const host = localBrowseHost(hostname)
  const base = `http://${host}:${port}/discover`
  if (lanHints.length === 0) return base
  const params = new URLSearchParams()
  for (const hint of lanHints) {
    if (hint) params.append('lanHint', hint)
  }
  return `${base}?${params.toString()}`
}

/**
 * Parse one advertised sitting into the Join Session list DTO.
 * Only campaignName is the display identity — date/time / playerLabel /
 * sessionName are never copied onto the advertisement.
 * Prefer row.host / row.hostHint when the discover endpoint stamps a peer IP.
 */
export function parseLanSessionAdvertisement(
  raw: unknown,
  hostHint: string,
  port: number,
): LanSessionAdvertisement | null {
  if (raw == null || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const campaignName =
    typeof row.campaignName === 'string' ? row.campaignName.trim() : ''
  const campaignId =
    typeof row.campaignId === 'string' ? row.campaignId.trim() : ''
  const playSessionId =
    typeof row.playSessionId === 'string' ? row.playSessionId.trim() : ''
  const joinToken =
    typeof row.joinToken === 'string' ? row.joinToken.trim() : ''
  const shortCode =
    typeof row.shortCode === 'string' ? row.shortCode.trim() : ''
  if (
    !campaignName ||
    !campaignId ||
    !playSessionId ||
    !joinToken ||
    !shortCode
  ) {
    return null
  }
  const stampedHost =
    typeof row.host === 'string' && row.host.trim()
      ? row.host.trim()
      : typeof row.hostHint === 'string' && row.hostHint.trim()
        ? row.hostHint.trim()
        : hostHint
  return {
    campaignName,
    campaignId,
    playSessionId,
    joinToken,
    shortCode,
    hostHint: stampedHost === 'localhost' ? '127.0.0.1' : stampedHost,
    port:
      typeof row.port === 'number' && Number.isFinite(row.port)
        ? row.port
        : port,
  }
}

export function parseLanSessionsResponse(
  body: unknown,
  hostHint: string,
): ListLanSessionsResult {
  if (body == null || typeof body !== 'object') {
    return {
      ok: false,
      sessions: [],
      lanAddresses: [],
      port: 8765,
      reason: 'Invalid /sessions response.',
    }
  }
  const row = body as Record<string, unknown>
  const port =
    typeof row.port === 'number' && Number.isFinite(row.port) ? row.port : 8765
  const lanAddresses = Array.isArray(row.lanAddresses)
    ? row.lanAddresses.filter((x): x is string => typeof x === 'string')
    : []
  const rawSessions = Array.isArray(row.sessions) ? row.sessions : []
  const sessions: LanSessionAdvertisement[] = []
  for (const entry of rawSessions) {
    const parsed = parseLanSessionAdvertisement(entry, hostHint, port)
    if (parsed) sessions.push(parsed)
  }
  const discovered = row.discover === true
  const ok = row.ok !== false
  let reason: string | null = null
  if (!ok && typeof row.reason === 'string' && row.reason.trim()) {
    reason = row.reason.trim()
  }
  return {
    ok,
    sessions,
    lanAddresses,
    port,
    reason,
    discovered,
  }
}

export type ListLanSessionsOpts = {
  /**
   * Hostname of the **local** interim sidecar used for browse (`/discover`).
   * Default: this device. Do **not** pass the Advanced GM IP here — that made
   * typing Advanced look like “browse works” while local discovery stayed broken.
   */
  hostHint?: string
  port?: number
  timeoutMs?: number
  /** When false, skip /discover and only hit /sessions (tests / fallback). */
  preferDiscover?: boolean
  /** Extra LAN IPs (browser-visible) so the sidecar probes the right /24. */
  lanHints?: string[]
  /** When false, skip in-browser /24 TCP fallback after empty discover. */
  allowBrowserProbe?: boolean
  /** Injected browser-hint detector (tests). */
  detectLanHints?: () => Promise<string[]>
  /** Injected browser probe (tests). */
  browserProbe?: typeof browserProbeLanSessions
}

async function fetchSessionsJson(
  url: string,
  timeoutMs: number,
): Promise<{ ok: true; body: unknown } | { ok: false; status?: number }> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return { ok: false, status: res.status }
    const body: unknown = await res.json()
    return { ok: true, body }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(t)
  }
}

/**
 * Probe the local interim host and return open sittings for Join Session.
 * Prefers `GET /discover` (UDP + TCP via Node sidecar, with browser LAN hints);
 * falls back to in-browser /24 TCP probe when discover returns empty — the same
 * reachability plane as Advanced IP join.
 */
export async function listLanSessions(
  opts: ListLanSessionsOpts | string = {},
): Promise<ListLanSessionsResult> {
  const normalized =
    typeof opts === 'string'
      ? { hostHint: opts }
      : opts
  const hostname =
    normalized.hostHint ??
    (typeof location !== 'undefined' ? location.hostname : '127.0.0.1')
  const normalizedHint = localBrowseHost(hostname)
  const port = normalized.port ?? 8765
  // Discover may UDP-listen (~450ms) then TCP-fallback (~2.5s). Budget above that.
  const timeoutMs = normalized.timeoutMs ?? 8000
  const preferDiscover = normalized.preferDiscover !== false
  const allowBrowserProbe = normalized.allowBrowserProbe !== false
  const detectHints = normalized.detectLanHints ?? detectBrowserLanIpv4s
  const probeBrowser = normalized.browserProbe ?? browserProbeLanSessions

  let lanHints = [...(normalized.lanHints ?? [])]
  if (lanHints.length === 0 && typeof detectHints === 'function') {
    try {
      lanHints = await detectHints()
    } catch {
      lanHints = []
    }
  }

  let result: ListLanSessionsResult | null = null

  if (preferDiscover) {
    const discovered = await fetchSessionsJson(
      interimWsDiscoverUrl(normalizedHint, port, lanHints),
      timeoutMs,
    )
    if (discovered.ok) {
      result = parseLanSessionsResponse(discovered.body, normalizedHint)
    }
    // Older host without /discover — fall through to /sessions.
  }

  if (!result) {
    const listed = await fetchSessionsJson(
      interimWsSessionsUrl(normalizedHint, port),
      Math.min(timeoutMs, 800),
    )
    if (!listed.ok) {
      if (listed.status != null) {
        return {
          ok: false,
          sessions: [],
          lanAddresses: [],
          port,
          reason: `Join Session browse failed (HTTP ${listed.status}).`,
        }
      }
      return {
        ok: false,
        sessions: [],
        lanAddresses: [],
        port,
        reason:
          'No interim GM host reachable for Join Session browse. On each device run Vite dev (auto-starts the listener) or `npm run gm:ws-host`. Same Wi‑Fi required. If browse stays empty after the GM opens the table, use Advanced with the GM Wi‑Fi IP (failure fallback only).',
      }
    }
    result = parseLanSessionsResponse(listed.body, normalizedHint)
  }

  if (
    result.ok &&
    result.sessions.length === 0 &&
    allowBrowserProbe &&
    lanHints.length > 0
  ) {
    try {
      const probed = await probeBrowser({
        lanHints,
        port,
        deadlineMs: Math.min(2500, timeoutMs),
      })
      if (probed.length > 0) {
        const sessions: LanSessionAdvertisement[] = []
        for (const row of probed) {
          const parsed = parseLanSessionAdvertisement(row, row.host, row.port)
          if (parsed) sessions.push(parsed)
        }
        if (sessions.length > 0) {
          return {
            ok: true,
            sessions,
            lanAddresses: lanHints,
            port,
            reason: null,
            discovered: true,
            browserProbed: true,
          }
        }
      }
    } catch {
      /* keep sidecar result */
    }
  }

  return result
}

/** Empty-list Radical Visibility copy when browse succeeded but found nothing. */
export function emptyLanBrowseHint(result: ListLanSessionsResult): string | null {
  if (!result.ok || result.sessions.length > 0) return null
  if (result.discovered || result.browserProbed) {
    return 'No open tables found on this Wi‑Fi yet. Confirm the GM clicked Open Table and you are on the same network. If browse stays empty, use Advanced with the GM Wi‑Fi IP (failure fallback only).'
  }
  return 'No open table on the probed host. If the GM is on another device, ensure its interim listener is running — or enter the GM Wi‑Fi IP under Advanced (failure fallback only).'
}
