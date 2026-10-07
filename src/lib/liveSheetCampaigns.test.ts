import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildCampaignPills,
  CAMPAIGNS_SUB_TAB_ORDER,
  listRememberedCampaigns,
  rememberJoinedCampaign,
} from './liveSheetCampaigns'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
    clear: () => {
      memory.clear()
    },
  },
})

describe('liveSheetCampaigns', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('exposes People · Places · Things · Notes sub-tabs', () => {
    expect(CAMPAIGNS_SUB_TAB_ORDER).toEqual([
      'people',
      'places',
      'things',
      'notes',
    ])
  })

  it('remembers joins per character and builds multi-pill lists', () => {
    rememberJoinedCampaign('char_a', { id: 'camp_1', name: 'Night City' })
    rememberJoinedCampaign('char_a', { id: 'camp_2', name: 'Rifts Earth' })
    expect(listRememberedCampaigns('char_a').map((p) => p.name)).toEqual([
      'Rifts Earth',
      'Night City',
    ])
    expect(listRememberedCampaigns('char_b')).toEqual([])

    const pills = buildCampaignPills({
      characterId: 'char_a',
      joined: { id: 'camp_1', name: 'Night City Live' },
    })
    expect(pills.map((p) => ({ id: p.id, name: p.name }))).toEqual([
      { id: 'camp_1', name: 'Night City Live' },
      { id: 'camp_2', name: 'Rifts Earth' },
    ])
  })

  it('returns empty pills when never joined', () => {
    expect(
      buildCampaignPills({ characterId: 'char_x', joined: null }),
    ).toEqual([])
  })
})
