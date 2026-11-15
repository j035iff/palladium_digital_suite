import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { ensureCharacterRoot } from './characterRoot'
import { EMPTY_INVENTORY_SESSION } from './inventoryPersistence'
import {
  LIVE_SHEET_JOIN_NO_TABLE_TOOLTIP,
  LIVE_SHEET_RETURN_TO_LAUNCHER_LABEL,
  liveSheetIsDirty,
  liveSheetSaveFingerprint,
  liveSheetSaveStatus,
  liveSheetSaveStatusLabel,
  shouldGuardLiveSheetLeave,
  shouldPushJoinedPartySnapshotOnLiveMutation,
} from './liveSheetSave'

const finalizedFixture = ensureCharacterRoot(
  { ...characterFixture, isFinalized: true },
  { creationGenreId: 'nightbane', hostGenreId: 'nightbane' },
)

describe('liveSheetSave', () => {
  it('fingerprints native save layout including inventory session', () => {
    const base = liveSheetSaveFingerprint(
      finalizedFixture,
      EMPTY_INVENTORY_SESSION,
    )
    const renamed = liveSheetSaveFingerprint(
      { ...finalizedFixture, name: 'Renamed' },
      EMPTY_INVENTORY_SESSION,
    )
    expect(base).not.toBe(renamed)
    expect(liveSheetIsDirty(renamed, base)).toBe(true)
    expect(liveSheetIsDirty(base, base)).toBe(false)
    expect(liveSheetIsDirty(base, null)).toBe(false)
  })

  it('maps dirty → unsaved status labels (Familiar Surface)', () => {
    expect(liveSheetSaveStatus(false)).toBe('saved')
    expect(liveSheetSaveStatus(true)).toBe('unsaved')
    expect(liveSheetSaveStatusLabel('saved')).toBe('Saved')
    expect(liveSheetSaveStatusLabel('unsaved')).toBe('Unsaved')
  })

  it('does not guard leave under auto-save', () => {
    expect(shouldGuardLiveSheetLeave(true, true)).toBe(false)
    expect(shouldGuardLiveSheetLeave(true, false)).toBe(false)
    expect(shouldGuardLiveSheetLeave(false, true)).toBe(false)
  })

  it('pushes joined party.snapshot on live mutations (auto-save)', () => {
    expect(shouldPushJoinedPartySnapshotOnLiveMutation()).toBe(true)
  })

  it('exposes Portal / Join tooltips for auto-save chrome', () => {
    expect(LIVE_SHEET_RETURN_TO_LAUNCHER_LABEL.toLowerCase()).toContain(
      'changes will be saved',
    )
    expect(LIVE_SHEET_JOIN_NO_TABLE_TOOLTIP).toBe('No table available')
  })
})
