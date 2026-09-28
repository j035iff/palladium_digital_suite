import { describe, expect, it } from 'vitest'
import {
  buildGmHubTabViews,
  GM_HUB_TAB_ORDER,
  gmHubTabTitle,
} from './hubTabs'

describe('GM Hub tabs', () => {
  it('uses Home plus Party, Cast, and Gear under both Story and Combat', () => {
    expect(GM_HUB_TAB_ORDER).toEqual(['home', 'party', 'cast', 'gear'])
    expect(buildGmHubTabViews('home', { campaignOpen: true }).map((tab) => tab.id)).toEqual(
      GM_HUB_TAB_ORDER,
    )
  })

  it('gives Home a mode-specific landing', () => {
    expect(gmHubTabTitle('story', 'home')).toBe('Sessions')
    expect(gmHubTabTitle('combat', 'home')).toBe('Combat')
    expect(gmHubTabTitle('combat', 'party')).toBe('Party')
    expect(gmHubTabTitle('combat', 'gear')).toBe('Gear')
  })

  it('locks Party, Cast, and Gear until a campaign is open', () => {
    const views = buildGmHubTabViews('home', { campaignOpen: false })
    expect(views.find((tab) => tab.id === 'home')?.clickable).toBe(true)
    expect(views.find((tab) => tab.id === 'party')?.clickable).toBe(false)
    expect(views.find((tab) => tab.id === 'cast')?.visual).toBe('locked')
    expect(views.find((tab) => tab.id === 'gear')?.visual).toBe('locked')
  })

  it('marks Party attention when partyTabBlink is set', () => {
    const idle = buildGmHubTabViews('home', {
      campaignOpen: true,
      partyTabBlink: false,
    })
    expect(idle.find((tab) => tab.id === 'party')?.attention).toBe(false)

    const blinking = buildGmHubTabViews('cast', {
      campaignOpen: true,
      partyTabBlink: true,
    })
    expect(blinking.find((tab) => tab.id === 'party')?.attention).toBe(true)
    expect(blinking.find((tab) => tab.id === 'cast')?.attention).toBe(false)

    const locked = buildGmHubTabViews('home', {
      campaignOpen: false,
      partyTabBlink: true,
    })
    expect(locked.find((tab) => tab.id === 'party')?.attention).toBe(false)
  })
})
