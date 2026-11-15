import type { CharacterRootState } from '../types'
import { serializeCharacterRootForSave } from './characterSave'
import {
  mergeCharacterWithInventory,
  type InventorySessionState,
} from './inventoryPersistence'

/**
 * Live-sheet persistence helpers (post-`isFinalized`).
 * Auto-save restored 2026-11-15 (Joe mockup rulings) — drop explicit Save /
 * dirty leave gate; background persist + joined party.snapshot on mutations.
 * Unified Path — one persist path for Story and Combat; no per-mode fork.
 */

export type LiveSheetSaveStatus = 'saved' | 'unsaved'

/** @deprecated Explicit Save chrome removed — kept for fingerprint helpers/tests. */
export const LIVE_SHEET_UNSAVED_TITLE = 'Unsaved edits'

/** @deprecated Explicit Save chrome removed. */
export const LIVE_SHEET_UNSAVED_BODY =
  'You have unsaved edits on this character sheet. Save before leaving, or continue without saving.'

/** @deprecated Explicit Save chrome removed. */
export const LIVE_SHEET_SAVE_LABEL = 'Save'

/** @deprecated Explicit Save chrome removed. */
export const LIVE_SHEET_CONTINUE_WITHOUT_SAVING_LABEL = 'Continue without saving'

/** @deprecated Explicit Save chrome removed. */
export const LIVE_SHEET_CANCEL_LEAVE_LABEL = 'Stay on sheet'

/** Portal / Return-to-Launcher tooltip (auto-save — no separate saved toast). */
export const LIVE_SHEET_RETURN_TO_LAUNCHER_LABEL =
  'Return to launcher — changes will be saved'

/** Join icon when discovery finds no open table (Radical Visibility). */
export const LIVE_SHEET_JOIN_NO_TABLE_TOOLTIP = 'No table available'

/** Stable fingerprint of what would be written on Save. */
export function liveSheetSaveFingerprint(
  state: CharacterRootState,
  inventorySession: InventorySessionState,
): string {
  return JSON.stringify(
    serializeCharacterRootForSave(
      mergeCharacterWithInventory(state, inventorySession),
    ),
  )
}

export function liveSheetIsDirty(
  currentFingerprint: string,
  lastSavedFingerprint: string | null,
): boolean {
  if (lastSavedFingerprint == null) return false
  return currentFingerprint !== lastSavedFingerprint
}

export function liveSheetSaveStatus(dirty: boolean): LiveSheetSaveStatus {
  return dirty ? 'unsaved' : 'saved'
}

export function liveSheetSaveStatusLabel(status: LiveSheetSaveStatus): string {
  return status === 'saved' ? 'Saved' : 'Unsaved'
}

/**
 * Leave guard — disabled under auto-save (Portal leaves flush in background).
 * Kept as a pure helper so callers / tests stay on one path.
 */
export function shouldGuardLiveSheetLeave(
  _isFinalized: boolean,
  _dirty: boolean,
): boolean {
  return false
}

/**
 * Joined-table peer sync (`party.snapshot`) follows auto-save — push on live
 * mutations (same debounce/flush as character file persist).
 *
 * Also flush on Review & Spawn finalize while joined, and Join Session attach
 * (`sendPartySnapshotOnJoin`).
 */
export function shouldPushJoinedPartySnapshotOnLiveMutation(): boolean {
  return true
}
