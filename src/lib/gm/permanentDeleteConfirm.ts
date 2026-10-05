/**
 * Shared permanent-delete confirm copy for GM Hub narrative surfaces
 * (placeholders, stubs, custom gear, spawned fodder). Familiar Surface:
 * label is Delete; dialog states the action is permanent.
 */

export function permanentDeleteConfirmMessage(entityLabel: string): string {
  const label = entityLabel.trim() || 'this entry'
  return `Delete "${label}"? This is permanent and cannot be undone.`
}

/** Returns true when the user confirms a permanent delete. */
export function confirmPermanentDelete(entityLabel: string): boolean {
  return globalThis.confirm(permanentDeleteConfirmMessage(entityLabel))
}
