import { describe, expect, it } from 'vitest'
import {
  buildGmHubTabViews,
  GM_HUB_TAB_ORDER,
  gmHubTabTitle,
} from './hubTabs'

describe('GM Hub tabs', () => {
  it('uses Home plus Party and Cast under both Story and Combat', () => {
    expect(GM_HUB_TAB_ORDER).toEqual(['home', 'party', 'cast'])
    expect(buildGmHubTabViews('home', { campaignOpen: true }).map((tab) => tab.id)).toEqual(
      GM_HUB_TAB_ORDER,
    )
  })

  it('gives Home a mode-specific landing', () => {
    expect(gmHubTabTitle('story', 'home')).toBe('Sessions')
    expect(gmHubTabTitle('combat', 'home')).toBe('Combat')
    expect(gmHubTabTitle('combat', 'party')).toBe('Party')
  })

  it('locks Party and Cast until a campaign is open', () => {
    const views = buildGmHubTabViews('home', { campaignOpen: false })
    expect(views.find((tab) => tab.id === 'home')?.clickable).toBe(true)
    expect(views.find((tab) => tab.id === 'party')?.clickable).toBe(false)
    expect(views.find((tab) => tab.id === 'cast')?.visual).toBe('locked')
  })
})
