/**
 * Ephemeral Characters/PCs blink for Join Table (hub chrome only).
 * Set when a seat flips to fully joined; clear when Characters → PCs opens
 * or the table closes. Do not fork Party panel — observer path stays unchanged.
 */

import {
  seatFlippedToFullyJoined,
  type GmPresenceState,
} from './sessionPresence'
import type { GmCharactersSubTabId, GmHubTabId } from './hubTabs'
import { isViewingCharactersPcs } from './hubTabs'

/**
 * True when any seat in `next` just became fully joined vs `previous`.
 */
export function anySeatFlippedToFullyJoined(
  previous: GmPresenceState | null | undefined,
  next: GmPresenceState,
  options: { requireCharacterId?: boolean } = {},
): boolean {
  return next.seats.some((seat) =>
    seatFlippedToFullyJoined(previous, next, seat.deviceId, options),
  )
}

/**
 * Next blink flag after a presence update.
 * - Presence cleared (Close Table / stop listen) → clear blink
 * - Already viewing Characters → PCs → do not blink (summary is already on screen)
 * - Else set when any seat flipped to fully joined; keep existing blink otherwise
 */
export function nextPartyTabBlink(input: {
  currentlyBlinking: boolean
  previousPresence: GmPresenceState | null | undefined
  nextPresence: GmPresenceState | null
  /** @deprecated Prefer viewingCharactersPcs — kept for call-site clarity. */
  viewingPartyTab?: boolean
  viewingCharactersPcs?: boolean
}): boolean {
  const viewingPcs =
    input.viewingCharactersPcs ?? input.viewingPartyTab ?? false
  const { currentlyBlinking, previousPresence, nextPresence } = input
  if (!nextPresence) return false
  if (
    anySeatFlippedToFullyJoined(previousPresence, nextPresence) &&
    !viewingPcs
  ) {
    return true
  }
  if (viewingPcs) return false
  return currentlyBlinking
}

/**
 * Opening Characters with PCs active (default) clears the blink.
 * Opening Characters on NPCs keeps blink so PCs sub-tab can cue (Radical Visibility).
 */
export function partyTabBlinkAfterTabChange(
  tabId: GmHubTabId,
  currentlyBlinking: boolean,
  charactersSubTabId: GmCharactersSubTabId = 'pcs',
): boolean {
  if (isViewingCharactersPcs(tabId, charactersSubTabId)) return false
  return currentlyBlinking
}

/** Selecting the PCs sub-tab under Characters clears the blink. */
export function partyTabBlinkAfterCharactersSubTabChange(
  subTabId: GmCharactersSubTabId,
  currentlyBlinking: boolean,
): boolean {
  if (subTabId === 'pcs') return false
  return currentlyBlinking
}
