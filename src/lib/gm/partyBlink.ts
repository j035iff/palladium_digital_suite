/**
 * Ephemeral Party-tab blink for Join Table (hub chrome only).
 * Set when a seat flips to fully joined; clear when Party opens or the table closes.
 * Do not fork Party panel — observer path stays unchanged.
 */

import {
  seatFlippedToFullyJoined,
  type GmPresenceState,
} from './sessionPresence'
import type { GmHubTabId } from './hubTabs'

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
 * - Already viewing Party → do not blink (summary is already on screen)
 * - Else set when any seat flipped to fully joined; keep existing blink otherwise
 */
export function nextPartyTabBlink(input: {
  currentlyBlinking: boolean
  previousPresence: GmPresenceState | null | undefined
  nextPresence: GmPresenceState | null
  viewingPartyTab: boolean
}): boolean {
  const { currentlyBlinking, previousPresence, nextPresence, viewingPartyTab } =
    input
  if (!nextPresence) return false
  if (
    anySeatFlippedToFullyJoined(previousPresence, nextPresence) &&
    !viewingPartyTab
  ) {
    return true
  }
  if (viewingPartyTab) return false
  return currentlyBlinking
}

/** Opening Party (or selecting the Party tab) clears the blink. */
export function partyTabBlinkAfterTabChange(
  tabId: GmHubTabId,
  currentlyBlinking: boolean,
): boolean {
  if (tabId === 'party') return false
  return currentlyBlinking
}
