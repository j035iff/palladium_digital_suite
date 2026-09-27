/**
 * LAN Join Session discovery — list open/advertised sittings from the interim
 * (or future desktop) GM host. Narrow interface so the sidecar can replace
 * advertisement without forking Join UI.
 *
 * Display identity for list rows is **campaignName only** (no date/time).
 * Routing fields (ids + token/code) stay on the DTO for connect; they are not
 * player-facing labels.
 */

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
}

/** HTTP advertise URL on the interim host (CORS open like /health). */
export function interimWsSessionsUrl(
  hostname =
    typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
  port = 8765,
): string {
  const host = hostname === 'localhost' ? '127.0.0.1' : hostname
  return `http://${host}:${port}/sessions`
}

/**
 * Parse one advertised sitting into the Join Session list DTO.
 * Only campaignName is the display identity — date/time / playerLabel /
 * sessionName are never copied onto the advertisement.
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
  return {
    campaignName,
    campaignId,
    playSessionId,
    joinToken,
    shortCode,
    hostHint,
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
  return {
    ok: row.ok !== false,
    sessions,
    lanAddresses,
    port,
    reason: null,
  }
}

export type ListLanSessionsOpts = {
  /** Hostname or LAN IP of the GM machine (same probe pattern as /health). */
  hostHint?: string
  port?: number
  timeoutMs?: number
}

/**
 * Probe a reachable GM host hint and return open sittings for Join Session.
 * Same hostname/IP pattern as `probeInterimWsHost` — not a subnet scan.
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
  const normalizedHint =
    hostname === 'localhost' ? '127.0.0.1' : hostname
  const port = normalized.port ?? 8765
  const timeoutMs = normalized.timeoutMs ?? 800

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(interimWsSessionsUrl(normalizedHint, port), {
      signal: ctrl.signal,
    })
    if (!res.ok) {
      return {
        ok: false,
        sessions: [],
        lanAddresses: [],
        port,
        reason: `Join Session browse failed (HTTP ${res.status}).`,
      }
    }
    const body: unknown = await res.json()
    return parseLanSessionsResponse(body, normalizedHint)
  } catch {
    return {
      ok: false,
      sessions: [],
      lanAddresses: [],
      port,
      reason:
        'No interim GM host reachable for Join Session browse. Confirm the GM machine is listening (`npm run gm:ws-host` or Vite dev).',
    }
  } finally {
    clearTimeout(t)
  }
}
