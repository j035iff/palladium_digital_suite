import type { CharacterRootState } from '../types'
import { serializeCharacterRootForSave } from './characterSave'
import {
  mergeCharacterWithInventory,
  type InventorySessionState,
} from './inventoryPersistence'

/**
 * Live-sheet explicit Save pipeline (post-`isFinalized` only).
 * Unified Path — one dirty/save status for Story and Combat; no per-mode fork.
 * Familiar Surface — ordinary Save + saved/unsaved affordance.
 */

export type LiveSheetSaveStatus = 'saved' | 'unsaved'

export const LIVE_SHEET_UNSAVED_TITLE = 'Unsaved edits'

export const LIVE_SHEET_UNSAVED_BODY =
  'You have unsaved edits on this character sheet. Save before leaving, or continue without saving.'

export const LIVE_SHEET_SAVE_LABEL = 'Save'

export const LIVE_SHEET_CONTINUE_WITHOUT_SAVING_LABEL = 'Continue without saving'

export const LIVE_SHEET_CANCEL_LEAVE_LABEL = 'Stay on sheet'

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
 * Whether the live sheet should intercept leave (Portal / launcher).
 * Only post-`isFinalized` dirty sheets — Creation keeps its own leave flow.
 */
export function shouldGuardLiveSheetLeave(
  isFinalized: boolean,
  dirty: boolean,
): boolean {
  return isFinalized === true && dirty === true
}

/**
 * Joined-table peer sync (`party.snapshot`) follows the same explicit-Save gate
 * as the character file. In-memory live mutations (identity, notes, gear, …)
 * must **not** push a snapshot until Save.
 *
 * Flush points (not covered here): Save, Review & Spawn finalize while joined,
 * and Join Session attach (`sendPartySnapshotOnJoin`).
 */
export function shouldPushJoinedPartySnapshotOnLiveMutation(): boolean {
  return false
}
