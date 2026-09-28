/**
 * Confirm copy + leave helpers for Return to Launcher (GM Close Table /
 * player detach). Pure strings — UI calls window.confirm with these.
 */

export const GM_RETURN_CLOSES_TABLE_CONFIRM =
  'Returning to the launcher will Close Table (unpublish and stop listening). Leave the hub?'

export const PLAYER_RETURN_LEAVES_TABLE_CONFIRM =
  'Returning to the launcher will leave this table. Leave the session?'

/** Player name on a Party overview card (upper-right). */
export function playerNameForPartyCharacter(
  seats: ReadonlyArray<{ characterId: string | null; displayName: string }>,
  characterId: string,
): string | null {
  const seat = seats.find((s) => s.characterId === characterId)
  const name = seat?.displayName?.trim()
  return name ? name : null
}

/**
 * Party tab shows joined seats only — character ids currently attached on
 * presence seats. Local machine adds (Cast) stay on partyCharacterIds for
 * combat/gear but do not render on Party.
 */
export function joinedPartyCharacterIds(
  seats: ReadonlyArray<{ characterId: string | null }>,
): string[] {
  const ids: string[] = []
  for (const seat of seats) {
    if (seat.characterId && !ids.includes(seat.characterId)) {
      ids.push(seat.characterId)
    }
  }
  return ids
}
