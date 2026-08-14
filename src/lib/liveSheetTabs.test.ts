import { describe, expect, it } from 'vitest'
import {
  buildLiveSheetTabViews,
  LIVE_SHEET_TAB_ORDER,
  liveSheetTabTitle,
} from './liveSheetTabs'

describe('liveSheetTabs', () => {
  it('uses Home plus shared drill-down tabs in both sheet modes', () => {
    expect(LIVE_SHEET_TAB_ORDER).toEqual([
      'home',
      'stats',
      'saves',
      'skills',
      'abilities',
      'gear',
    ])
    expect(buildLiveSheetTabViews('home').map((tab) => tab.id)).toEqual(
      LIVE_SHEET_TAB_ORDER,
    )
  })

  it('gives Home a mode-specific purpose', () => {
    expect(liveSheetTabTitle('story', 'home')).toBe('Story notes')
    expect(liveSheetTabTitle('combat', 'home')).toBe('Combat HUD')
    expect(liveSheetTabTitle('combat', 'skills')).toBe('Skills')
  })
})
