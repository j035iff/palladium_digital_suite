/**
 * Compact GM Hub table control + Players overlay state (pure).
 * UI: Open Table publishes; Table Open expands the hover overlay; Close Table
 * lives only inside the overlay. Advanced join chrome stays out of this path.
 */

export type HubTableControlKind = 'open_table' | 'table_open'

export type HubTableControlClickAction =
  | 'publish'
  | 'toggle_players_panel'
  | 'none'

export function hubTableControlKind(tableOpen: boolean): HubTableControlKind {
  return tableOpen ? 'table_open' : 'open_table'
}

export function hubTableControlLabel(kind: HubTableControlKind): string {
  return kind === 'table_open' ? 'Table Open' : 'Open Table'
}

/**
 * Why the table control is greyed. Null when clickable.
 * When the table is already open, the control stays enabled (expands Players).
 */
export function hubTableControlDisabledReason(input: {
  campaignOpen: boolean
  tableOpen: boolean
}): string | null {
  if (input.tableOpen) return null
  if (!input.campaignOpen) {
    return 'Open a campaign from the launcher first'
  }
  return null
}

export function hubTableControlClickAction(input: {
  tableOpen: boolean
  canPublish: boolean
}): HubTableControlClickAction {
  if (input.tableOpen) return 'toggle_players_panel'
  return input.canPublish ? 'publish' : 'none'
}

/** Click Table Open toggles the Players overlay (does not re-publish). */
export function playersPanelAfterTableOpenClick(expanded: boolean): boolean {
  return !expanded
}

/** Desktop hover persistence: leaving the control+panel zone collapses. */
export function playersPanelAfterPointerLeave(): boolean {
  return false
}

/** Closing the sitting always collapses the overlay. */
export function playersPanelAfterCloseTable(): boolean {
  return false
}

/**
 * Keep expand only while a sitting is live — Close Table / stamp rollback
 * must not leave a ghost panel.
 */
export function playersPanelForTableOpenState(
  tableOpen: boolean,
  expanded: boolean,
): boolean {
  return tableOpen ? expanded : false
}

export type SeatOverlayLines = {
  playerLine: string
  /** Character display name when attached; null while joining / no attach. */
  characterLine: string | null
}

/**
 * One-line player + one-line character for the Players overlay.
 * Character names resolve from party observer ids when available.
 */
export function seatOverlayLines(
  seat: { displayName: string; characterId: string | null },
  characterNameById?: ReadonlyMap<string, string> | Record<string, string>,
): SeatOverlayLines {
  const playerLine = seat.displayName.trim() || 'Player'
  if (!seat.characterId) {
    return { playerLine, characterLine: null }
  }
  let resolved: string | undefined
  if (characterNameById instanceof Map) {
    resolved = characterNameById.get(seat.characterId)
  } else if (characterNameById && typeof characterNameById === 'object') {
    resolved = (characterNameById as Record<string, string>)[seat.characterId]
  }
  const characterLine = (resolved?.trim() || seat.characterId).trim()
  return { playerLine, characterLine }
}
