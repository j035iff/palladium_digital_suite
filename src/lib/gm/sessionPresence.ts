/**
 * Ephemeral seat roster for an open play sitting.
 * Not persisted on GmSessionRecord — lives in host runtime memory only.
 */

export type GmSeatStatus = 'connected' | 'reconnecting'

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
 * Same deviceId reclaims the seat for the life of the sitting.
 * Close Session clears all seats (caller uses clearPresence).
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
    return {
      ...presence,
      seats: presence.seats.map((s) =>
        s.deviceId === input.deviceId
          ? {
              ...s,
              displayName: input.displayName.trim() || s.displayName,
              status: 'connected',
              lastSeenAtMs: atMs,
            }
          : s,
      ),
    }
  }
  const seat: GmSeat = {
    deviceId: input.deviceId,
    displayName: input.displayName.trim() || 'Player',
    status: 'connected',
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

export function attachSeatCharacter(
  presence: GmPresenceState,
  deviceId: string,
  characterId: string,
): GmPresenceState {
  if (!findSeat(presence, deviceId)) return presence
  return {
    ...presence,
    seats: presence.seats.map((s) =>
      s.deviceId === deviceId ? { ...s, characterId } : s,
    ),
  }
}

export function clearPresence(playSessionId: string): GmPresenceState {
  return emptyPresence(playSessionId)
}

export function connectedSeatCount(presence: GmPresenceState): number {
  return presence.seats.filter((s) => s.status === 'connected').length
}
