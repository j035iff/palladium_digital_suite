import { describe, expect, it } from 'vitest'
import {
  buildLiveSheetOverlayTabViews,
  buildLiveSheetTabViews,
  LIVE_SHEET_MODE_LABELS,
  LIVE_SHEET_OVERLAY_TAB_ORDER,
  LIVE_SHEET_TAB_ORDER,
  liveSheetModeLabel,
  liveSheetTabTitle,
} from './liveSheetTabs'

describe('liveSheetTabs', () => {
  it('keeps Home in the body pipeline and overlays as the strip set', () => {
    expect(LIVE_SHEET_TAB_ORDER).toEqual([
      'home',
      'stats',
      'bonuses',
      'skills',
      'abilities',
      'gear',
    ])
    expect(LIVE_SHEET_OVERLAY_TAB_ORDER).toEqual([
      'stats',
      'bonuses',
      'skills',
      'abilities',
      'gear',
    ])
    expect(buildLiveSheetTabViews('home').map((tab) => tab.id)).toEqual(
      LIVE_SHEET_TAB_ORDER,
    )
    expect(buildLiveSheetOverlayTabViews(null).map((tab) => tab.id)).toEqual(
      LIVE_SHEET_OVERLAY_TAB_ORDER,
    )
    expect(
      buildLiveSheetOverlayTabViews('stats').find((t) => t.id === 'stats')
        ?.visual,
    ).toBe('active')
  })

  it('labels story mode Campaigns (not Story / Narrative)', () => {
    expect(LIVE_SHEET_MODE_LABELS.story).toBe('Campaigns')
    expect(liveSheetModeLabel('story')).toBe('Campaigns')
    expect(liveSheetModeLabel('combat')).toBe('Combat')
  })

  it('gives Home a mode-specific purpose', () => {
    expect(liveSheetTabTitle('story', 'home')).toBe('Campaign notes')
    expect(liveSheetTabTitle('combat', 'home')).toBe('Combat HUD')
    expect(liveSheetTabTitle('combat', 'skills')).toBe('Skills')
  })

  it('labels the bonuses overlay Bonuses (not Saves)', () => {
    expect(
      buildLiveSheetOverlayTabViews(null).find((t) => t.id === 'bonuses')
        ?.label,
    ).toBe('Bonuses')
    expect(liveSheetTabTitle('combat', 'bonuses')).toBe('Saving throws')
  })
})
