import { describe, expect, it } from 'vitest'
import {
  buildGmCharactersSubTabViews,
  buildGmHubTabViews,
  buildGmThingsSubTabViews,
  defaultHubTabForMode,
  GM_CHARACTERS_SUB_TAB_ORDER,
  GM_COMBAT_TAB_ORDER,
  GM_HUB_MODE_LABELS,
  GM_STORY_TAB_ORDER,
  GM_THINGS_SUB_TAB_ORDER,
  gmHubModeLabel,
  gmHubTabTitle,
  hubTabOrderForMode,
  isViewingCharactersPcs,
  isViewingNarrativePeoplePcs,
} from './hubTabs'

describe('GM Hub tabs', () => {
  it('uses lane-specific Narrative and Combat top tabs', () => {
    expect(GM_STORY_TAB_ORDER).toEqual([
      'story_beats',
      'people',
      'places',
      'things',
      'notes',
    ])
    expect(GM_COMBAT_TAB_ORDER).toEqual(['melee', 'prefabs'])
    expect(hubTabOrderForMode('story')).toEqual(GM_STORY_TAB_ORDER)
    expect(hubTabOrderForMode('combat')).toEqual(GM_COMBAT_TAB_ORDER)
    expect(
      buildGmHubTabViews('story', 'story_beats', { campaignOpen: true }).map(
        (tab) => tab.id,
      ),
    ).toEqual(GM_STORY_TAB_ORDER)
    expect(
      buildGmHubTabViews('combat', 'melee', { campaignOpen: true }).map(
        (tab) => tab.id,
      ),
    ).toEqual(GM_COMBAT_TAB_ORDER)
  })

  it('defaults mode switch to Story Beats / Melee', () => {
    expect(defaultHubTabForMode('story')).toBe('story_beats')
    expect(defaultHubTabForMode('combat')).toBe('melee')
  })

  it('displays Narrative for internal hubMode story', () => {
    expect(GM_HUB_MODE_LABELS.story).toBe('Narrative')
    expect(gmHubModeLabel('story')).toBe('Narrative')
    expect(gmHubModeLabel('combat')).toBe('Combat')
  })

  it('nests PCs and NPCs under People', () => {
    expect(GM_CHARACTERS_SUB_TAB_ORDER).toEqual(['pcs', 'npcs'])
    expect(
      buildGmCharactersSubTabViews('pcs').map((tab) => tab.id),
    ).toEqual(GM_CHARACTERS_SUB_TAB_ORDER)
  })

  it('nests Notes stub and Gear under Things', () => {
    expect(GM_THINGS_SUB_TAB_ORDER).toEqual(['notes', 'gear'])
    expect(buildGmThingsSubTabViews('notes').map((tab) => tab.id)).toEqual(
      GM_THINGS_SUB_TAB_ORDER,
    )
  })

  it('titles tabs with lane labels', () => {
    expect(gmHubTabTitle('story', 'story_beats')).toBe('Story Beats')
    expect(gmHubTabTitle('story', 'people')).toBe('People')
    expect(gmHubTabTitle('combat', 'melee')).toBe('Melee')
    expect(gmHubTabTitle('combat', 'prefabs')).toBe('Prefabs')
  })

  it('locks non-default tabs until a campaign is open', () => {
    const story = buildGmHubTabViews('story', 'story_beats', {
      campaignOpen: false,
    })
    expect(story.find((tab) => tab.id === 'story_beats')?.clickable).toBe(true)
    expect(story.find((tab) => tab.id === 'people')?.clickable).toBe(false)
    expect(story.find((tab) => tab.id === 'things')?.visual).toBe('locked')

    const combat = buildGmHubTabViews('combat', 'melee', {
      campaignOpen: false,
    })
    expect(combat.find((tab) => tab.id === 'melee')?.clickable).toBe(true)
    expect(combat.find((tab) => tab.id === 'prefabs')?.clickable).toBe(false)
  })

  it('marks Narrative People attention when partyTabBlink is set and People is not open', () => {
    const idle = buildGmHubTabViews('story', 'story_beats', {
      campaignOpen: true,
      partyTabBlink: false,
    })
    expect(idle.find((tab) => tab.id === 'people')?.attention).toBe(false)

    const blinking = buildGmHubTabViews('story', 'notes', {
      campaignOpen: true,
      partyTabBlink: true,
    })
    expect(blinking.find((tab) => tab.id === 'people')?.attention).toBe(true)
    expect(blinking.find((tab) => tab.id === 'notes')?.attention).toBe(false)

    const onPeople = buildGmHubTabViews('story', 'people', {
      campaignOpen: true,
      partyTabBlink: true,
    })
    expect(onPeople.find((tab) => tab.id === 'people')?.attention).toBe(false)

    const locked = buildGmHubTabViews('story', 'story_beats', {
      campaignOpen: false,
      partyTabBlink: true,
    })
    expect(locked.find((tab) => tab.id === 'people')?.attention).toBe(false)
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

  it('treats Narrative → People → PCs as the joined summary surface', () => {
    expect(isViewingCharactersPcs('people', 'pcs')).toBe(true)
    expect(isViewingCharactersPcs('people', 'npcs')).toBe(false)
    expect(isViewingCharactersPcs('melee', 'pcs')).toBe(false)
    expect(isViewingNarrativePeoplePcs('story', 'people', 'pcs')).toBe(true)
    expect(isViewingNarrativePeoplePcs('combat', 'people', 'pcs')).toBe(false)
  })
})
