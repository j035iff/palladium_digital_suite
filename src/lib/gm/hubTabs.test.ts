import { describe, expect, it } from 'vitest'
import {
  buildGmCharactersSubTabViews,
  buildGmHubTabViews,
  buildGmStoryHomeSubTabViews,
  GM_CHARACTERS_SUB_TAB_ORDER,
  GM_HUB_MODE_LABELS,
  GM_HUB_TAB_ORDER,
  GM_STORY_HOME_SUB_TAB_ORDER,
  gmHubModeLabel,
  gmHubTabTitle,
  gmStoryHomeStubReason,
  isViewingCharactersPcs,
} from './hubTabs'

describe('GM Hub tabs', () => {
  it('uses Home plus Characters and Gear under both Narrative and Combat', () => {
    expect(GM_HUB_TAB_ORDER).toEqual(['home', 'characters', 'gear'])
    expect(
      buildGmHubTabViews('home', { campaignOpen: true }).map((tab) => tab.id),
    ).toEqual(GM_HUB_TAB_ORDER)
  })

  it('displays Narrative for internal hubMode story', () => {
    expect(GM_HUB_MODE_LABELS.story).toBe('Narrative')
    expect(gmHubModeLabel('story')).toBe('Narrative')
    expect(gmHubModeLabel('combat')).toBe('Combat')
  })

  it('nests PCs and NPCs under Characters', () => {
    expect(GM_CHARACTERS_SUB_TAB_ORDER).toEqual(['pcs', 'npcs'])
    expect(
      buildGmCharactersSubTabViews('pcs').map((tab) => tab.id),
    ).toEqual(GM_CHARACTERS_SUB_TAB_ORDER)
  })

  it('nests People / Places / Things / Notes under Narrative Home', () => {
    expect(GM_STORY_HOME_SUB_TAB_ORDER).toEqual([
      'people',
      'places',
      'things',
      'notes',
    ])
    expect(
      buildGmStoryHomeSubTabViews('notes').map((tab) => tab.id),
    ).toEqual(GM_STORY_HOME_SUB_TAB_ORDER)
    // Placeholder lanes are live — no “not in this build” grey-out.
    expect(gmStoryHomeStubReason('people')).toBe('')
    expect(gmStoryHomeStubReason('places')).toBe('')
    expect(gmStoryHomeStubReason('things')).toBe('')
    expect(gmStoryHomeStubReason('notes')).toBe('')
  })

  it('gives Home a mode-specific landing', () => {
    expect(gmHubTabTitle('story', 'home')).toBe('Narrative')
    expect(gmHubTabTitle('combat', 'home')).toBe('Combat')
    expect(gmHubTabTitle('combat', 'characters')).toBe('Characters')
    expect(gmHubTabTitle('combat', 'gear')).toBe('Gear')
  })

  it('locks Characters and Gear until a campaign is open', () => {
    const views = buildGmHubTabViews('home', { campaignOpen: false })
    expect(views.find((tab) => tab.id === 'home')?.clickable).toBe(true)
    expect(views.find((tab) => tab.id === 'characters')?.clickable).toBe(false)
    expect(views.find((tab) => tab.id === 'gear')?.visual).toBe('locked')
  })

  it('marks Characters attention when partyTabBlink is set and Characters is not open', () => {
    const idle = buildGmHubTabViews('home', {
      campaignOpen: true,
      partyTabBlink: false,
    })
    expect(idle.find((tab) => tab.id === 'characters')?.attention).toBe(false)

    const blinking = buildGmHubTabViews('gear', {
      campaignOpen: true,
      partyTabBlink: true,
    })
    expect(blinking.find((tab) => tab.id === 'characters')?.attention).toBe(
      true,
    )
    expect(blinking.find((tab) => tab.id === 'gear')?.attention).toBe(false)

    const onCharacters = buildGmHubTabViews('characters', {
      campaignOpen: true,
      partyTabBlink: true,
    })
    expect(onCharacters.find((tab) => tab.id === 'characters')?.attention).toBe(
      false,
    )

    const locked = buildGmHubTabViews('home', {
      campaignOpen: false,
      partyTabBlink: true,
    })
    expect(locked.find((tab) => tab.id === 'characters')?.attention).toBe(false)
  })

  it('marks PCs sub-tab attention when blinking and NPCs is open', () => {
    const onPcs = buildGmCharactersSubTabViews('pcs', { partyTabBlink: true })
    expect(onPcs.find((tab) => tab.id === 'pcs')?.attention).toBe(false)

    const onNpcs = buildGmCharactersSubTabViews('npcs', {
      partyTabBlink: true,
    })
    expect(onNpcs.find((tab) => tab.id === 'pcs')?.attention).toBe(true)
    expect(onNpcs.find((tab) => tab.id === 'npcs')?.attention).toBe(false)
  })

  it('treats Characters → PCs as the joined summary surface', () => {
    expect(isViewingCharactersPcs('characters', 'pcs')).toBe(true)
    expect(isViewingCharactersPcs('characters', 'npcs')).toBe(false)
    expect(isViewingCharactersPcs('gear', 'pcs')).toBe(false)
  })
})
