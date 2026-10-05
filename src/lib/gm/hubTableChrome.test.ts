import { describe, expect, it } from 'vitest'
import {
  hubTableControlClickAction,
  hubTableControlDisabledReason,
  hubTableControlKind,
  hubTableControlLabel,
  playersPanelAfterCloseTable,
  playersPanelAfterPointerLeave,
  playersPanelAfterTableOpenClick,
  playersPanelForTableOpenState,
  seatOverlayLines,
} from './hubTableChrome'

describe('hubTableChrome', () => {
  it('labels Open Table vs Table Open from sitting state', () => {
    expect(hubTableControlKind(false)).toBe('open_table')
    expect(hubTableControlLabel('open_table')).toBe('Open Table')
    expect(hubTableControlKind(true)).toBe('table_open')
    expect(hubTableControlLabel('table_open')).toBe('Table Open')
  })

  it('greys Open Table only when no campaign; Table Open stays clickable', () => {
    expect(
      hubTableControlDisabledReason({ campaignOpen: false, tableOpen: false }),
    ).toMatch(/campaign/i)
    expect(
      hubTableControlDisabledReason({ campaignOpen: true, tableOpen: false }),
    ).toBeNull()
    expect(
      hubTableControlDisabledReason({ campaignOpen: true, tableOpen: true }),
    ).toBeNull()
  })

  it('routes click to publish or toggle Players panel', () => {
    expect(
      hubTableControlClickAction({ tableOpen: false, canPublish: true }),
    ).toBe('publish')
    expect(
      hubTableControlClickAction({ tableOpen: false, canPublish: false }),
    ).toBe('none')
    expect(
      hubTableControlClickAction({ tableOpen: true, canPublish: false }),
    ).toBe('toggle_players_panel')
  })

  it('expands/collapses Players overlay with hover leave + Close Table', () => {
    expect(playersPanelAfterTableOpenClick(false)).toBe(true)
    expect(playersPanelAfterTableOpenClick(true)).toBe(false)
    expect(playersPanelAfterPointerLeave()).toBe(false)
    expect(playersPanelAfterCloseTable()).toBe(false)
    expect(playersPanelForTableOpenState(false, true)).toBe(false)
    expect(playersPanelForTableOpenState(true, true)).toBe(true)
  })

  it('formats seat overlay player + character lines', () => {
    expect(
      seatOverlayLines({ displayName: 'Ada', characterId: null }),
    ).toEqual({ playerLine: 'Ada', characterLine: null })

    expect(
      seatOverlayLines(
        { displayName: 'Ada', characterId: 'char_1' },
        { char_1: 'Nightblade' },
      ),
    ).toEqual({ playerLine: 'Ada', characterLine: 'Nightblade' })

    expect(
      seatOverlayLines(
        { displayName: 'Ada', characterId: 'char_1' },
        new Map([['char_1', 'Nightblade']]),
      ),
    ).toEqual({ playerLine: 'Ada', characterLine: 'Nightblade' })

    expect(
      seatOverlayLines({ displayName: 'Ada', characterId: 'char_1' }),
    ).toEqual({ playerLine: 'Ada', characterLine: 'char_1' })

    expect(
      seatOverlayLines({
        displayName: 'Ada',
        characterId: 'char_1',
        projectedCharacterName: 'Crow',
      }),
    ).toEqual({ playerLine: 'Ada', characterLine: 'Crow' })
  })
})
