import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { ensureCharacterRoot } from './characterRoot'
import { EMPTY_INVENTORY_SESSION } from './inventoryPersistence'
import {
  LIVE_SHEET_CONTINUE_WITHOUT_SAVING_LABEL,
  LIVE_SHEET_SAVE_LABEL,
  LIVE_SHEET_UNSAVED_BODY,
  LIVE_SHEET_UNSAVED_TITLE,
  liveSheetIsDirty,
  liveSheetSaveFingerprint,
  liveSheetSaveStatus,
  liveSheetSaveStatusLabel,
  shouldGuardLiveSheetLeave,
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

  it('guards leave only for finalized dirty sheets', () => {
    expect(shouldGuardLiveSheetLeave(true, true)).toBe(true)
    expect(shouldGuardLiveSheetLeave(true, false)).toBe(false)
    expect(shouldGuardLiveSheetLeave(false, true)).toBe(false)
  })

  it('exposes unsaved-dialog copy for Save / Continue without saving', () => {
    expect(LIVE_SHEET_UNSAVED_TITLE.length).toBeGreaterThan(0)
    expect(LIVE_SHEET_UNSAVED_BODY.toLowerCase()).toContain('unsaved')
    expect(LIVE_SHEET_SAVE_LABEL).toBe('Save')
    expect(LIVE_SHEET_CONTINUE_WITHOUT_SAVING_LABEL.toLowerCase()).toContain(
      'without saving',
    )
  })
})
