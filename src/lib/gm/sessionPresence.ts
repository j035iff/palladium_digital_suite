/**
 * Ephemeral seat roster for an open play sitting.
 * Not persisted on GmSessionRecord — lives in host runtime memory only.
 *
 * Seat lifecycle (Join Table):
 * - New grant → `joining` (yellow / “joining” in GM tray)
 * - Fully at table → `connected` (wire name for joined; green, no joining text)
 * - Dropped transport → `reconnecting`
 *
 * Default: join completes when welcome/hello path has run and a character is
 * attached (`party.snapshot`). Socket-up without `characterId` stays `joining`.
 */

export type GmSeatStatus = 'joining' | 'connected' | 'reconnecting'

/** Wire `connected` = fully joined at the table (UI maps to green). */
export type GmSeat = {
  deviceId: string
  displayName: string
  status: GmSeatStatus
  joinedAtMs: number
  lastSeenAtMs: number
  /** Character id attached via party.snapshot, if any. */
  characterId: string | null
}

export type GmPresenceState = {
  playSessionId: string
  seats: GmSeat[]
}

/** Dumb-UI tokens for Players in Session tray (no React). */
export type GmSeatTrayPresentation = {
  /** Story colors: yellow while joining, green when fully joined. */
  tone: 'yellow' | 'green' | 'neutral'
  /** Show the literal “joining” label next to the player name. */
  showJoiningLabel: boolean
}

export function emptyPresence(playSessionId: string): GmPresenceState {
  return { playSessionId, seats: [] }
}

export function findSeat(
  presence: GmPresenceState,
  deviceId: string,
): GmSeat | undefined {
  return presence.seats.find((s) => s.deviceId === deviceId)
}

/**
 * Status after grant/reclaim: keep fully joined only when a character is already
 * attached; otherwise stay/return to `joining` until snapshot completes join.
 */
export function seatStatusAfterGrant(seat: {
  characterId: string | null
}): GmSeatStatus {
  return seat.characterId ? 'connected' : 'joining'
}

/**
 * Whether the seat is fully at the table.
 * When `requireCharacterId` is true (default), `connected` alone is not enough —
 * a character must be attached (party.snapshot accepted).
 */
export function isSeatFullyJoined(
  seat: GmSeat,
  options: { requireCharacterId?: boolean } = {},
): boolean {
  const requireCharacterId = options.requireCharacterId !== false
  if (seat.status !== 'connected') return false
  if (requireCharacterId && !seat.characterId) return false
  return true
}

export function isSeatJoining(seat: GmSeat): boolean {
  return seat.status === 'joining'
}

/**
 * Tray color + “joining” copy for a seat status. Map in chrome; do not fork roster.
 */
export function seatTrayPresentation(
  status: GmSeatStatus,
): GmSeatTrayPresentation {
  switch (status) {
    case 'joining':
      return { tone: 'yellow', showJoiningLabel: true }
    case 'connected':
      return { tone: 'green', showJoiningLabel: false }
    case 'reconnecting':
      return { tone: 'neutral', showJoiningLabel: false }
  }
}

/**
 * True when this device flipped into fully joined (for Party tab blink, etc.).
 * Compares previous presence snapshot to next after a reduce.
 */
export function seatFlippedToFullyJoined(
  previous: GmPresenceState | null | undefined,
  next: GmPresenceState,
  deviceId: string,
  options: { requireCharacterId?: boolean } = {},
): boolean {
  const nextSeat = findSeat(next, deviceId)
  if (!nextSeat || !isSeatFullyJoined(nextSeat, options)) return false
  const prevSeat = previous ? findSeat(previous, deviceId) : undefined
  if (!prevSeat) return true
  return !isSeatFullyJoined(prevSeat, options)
}

/**
 * Same deviceId reclaims the seat for the life of the sitting.
 * Close Session clears all seats (caller uses clearPresence).
 * New seats start as `joining` until character attach completes join.
 */
export function grantOrReclaimSeat(
  presence: GmPresenceState,
  input: {
    deviceId: string
    displayName: string
    atMs?: number
  },
): GmPresenceState {
  const atMs = input.atMs ?? Date.now()
  const existing = findSeat(presence, input.deviceId)
  if (existing) {
    const displayName = input.displayName.trim() || existing.displayName
    return {
      ...presence,
      seats: presence.seats.map((s) =>
        s.deviceId === input.deviceId
          ? {
              ...s,
              displayName,
              status: seatStatusAfterGrant(s),
              lastSeenAtMs: atMs,
            }
          : s,
      ),
    }
  }
  const seat: GmSeat = {
    deviceId: input.deviceId,
    displayName: input.displayName.trim() || 'Player',
    status: 'joining',
    joinedAtMs: atMs,
    lastSeenAtMs: atMs,
    characterId: null,
  }
  return { ...presence, seats: [...presence.seats, seat] }
}

export function markSeatReconnecting(
  presence: GmPresenceState,
  deviceId: string,
  atMs = Date.now(),
): GmPresenceState {
  if (!findSeat(presence, deviceId)) return presence
  return {
    ...presence,
    seats: presence.seats.map((s) =>
      s.deviceId === deviceId
        ? { ...s, status: 'reconnecting', lastSeenAtMs: atMs }
        : s,
    ),
  }
}

export function kickSeat(
  presence: GmPresenceState,
  deviceId: string,
): GmPresenceState {
  return {
    ...presence,
    seats: presence.seats.filter((s) => s.deviceId !== deviceId),
  }
}

/**
 * Attach character from party.snapshot and complete join (`joining` → `connected`).
 */
export function attachSeatCharacter(
  presence: GmPresenceState,
  deviceId: string,
  characterId: string,
): GmPresenceState {
  if (!findSeat(presence, deviceId)) return presence
  return {
    ...presence,
    seats: presence.seats.map((s) =>
      s.deviceId === deviceId
        ? { ...s, characterId, status: 'connected' }
        : s,
    ),
  }
}

export function clearPresence(playSessionId: string): GmPresenceState {
  return emptyPresence(playSessionId)
}

/** Count seats that are fully joined (wire status `connected`). */
export function connectedSeatCount(presence: GmPresenceState): number {
  return presence.seats.filter((s) => s.status === 'connected').length
}

export function joiningSeatCount(presence: GmPresenceState): number {
  return presence.seats.filter((s) => s.status === 'joining').length
}
