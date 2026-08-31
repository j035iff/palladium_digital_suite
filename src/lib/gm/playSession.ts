import { createGmId } from './sessionId'
import type { GmPlaySession, GmSessionRecord } from './sessionTypes'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** Local calendar date, English month — player-facing join name. */
export function formatPlaySessionDate(openedAtMs: number): string {
  const d = new Date(openedAtMs)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function formatPlaySessionDateTime(openedAtMs: number): string {
  const d = new Date(openedAtMs)
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatPlaySessionDate(openedAtMs)}, ${time}`
}

/** Players see `{campaignName}: {date}`. */
export function playSessionPlayerLabel(
  campaignName: string,
  openedAtMs: number,
): string {
  return `${campaignName}: ${formatPlaySessionDate(openedAtMs)}`
}

export function uniquePlaySessionPlayerLabel(
  campaignName: string,
  openedAtMs: number,
  takenLabels: readonly string[],
): string {
  const base = playSessionPlayerLabel(campaignName, openedAtMs)
  if (!takenLabels.includes(base)) return base
  return `${campaignName}: ${formatPlaySessionDateTime(openedAtMs)}`
}

export function hydratePlaySessions(
  session: GmSessionRecord,
): GmSessionRecord {
  return {
    ...session,
    playSessions: Array.isArray(session.playSessions)
      ? session.playSessions
      : [],
    activePlaySessionId: session.activePlaySessionId ?? null,
  }
}

export function activePlaySession(
  session: GmSessionRecord,
): GmPlaySession | null {
  const hydrated = hydratePlaySessions(session)
  if (!hydrated.activePlaySessionId) return null
  return (
    hydrated.playSessions.find(
      (row) =>
        row.id === hydrated.activePlaySessionId && row.status === 'open',
    ) ?? null
  )
}

export function createPlaySessionRecord(
  campaignName: string,
  openedAtMs: number,
  takenLabels: readonly string[],
): GmPlaySession {
  return {
    id: createGmId('play'),
    playerLabel: uniquePlaySessionPlayerLabel(
      campaignName,
      openedAtMs,
      takenLabels,
    ),
    openedAtMs,
    closedAtMs: null,
    status: 'open',
  }
}
