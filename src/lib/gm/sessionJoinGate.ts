/**
 * Client Join Session row gate (Radical Visibility).
 * Pure predicates — Join Table UI greys rows and shows why when disabled.
 *
 * Session row enabled iff player name (trimmed) and a character id are set.
 */

export type GmJoinSessionGateInput = {
  playerName: string
  /** Selected finalized character save id; null/undefined/'' = missing. */
  characterId: string | null | undefined
}

export type GmJoinSessionGate = {
  canJoin: boolean
  /** Visible explanation when greyd; null when enabled. */
  disabledReason: string | null
}

function hasPlayerName(playerName: string): boolean {
  return playerName.trim().length > 0
}

function hasCharacterId(characterId: string | null | undefined): boolean {
  return typeof characterId === 'string' && characterId.trim().length > 0
}

/**
 * Whether a Join Session list row may be activated.
 * Restricted options stay visible; callers grey + show `disabledReason`.
 */
export function resolveJoinSessionGate(
  input: GmJoinSessionGateInput,
): GmJoinSessionGate {
  const nameOk = hasPlayerName(input.playerName)
  const characterOk = hasCharacterId(input.characterId)

  if (nameOk && characterOk) {
    return { canJoin: true, disabledReason: null }
  }

  if (!nameOk && !characterOk) {
    return {
      canJoin: false,
      disabledReason:
        'Enter a player name and select a character before joining a session.',
    }
  }
  if (!nameOk) {
    return {
      canJoin: false,
      disabledReason: 'Enter a player name before joining a session.',
    }
  }
  return {
    canJoin: false,
    disabledReason: 'Select a character before joining a session.',
  }
}
