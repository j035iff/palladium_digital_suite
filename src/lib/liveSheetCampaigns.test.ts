import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import {
  buildCampaignPills,
  CAMPAIGNS_SUB_TAB_ORDER,
  campaignDeleteConfirmMessage,
  campaignMergeConfirmMessage,
  campaignsSubTabForContentKind,
  deleteSheetCampaign,
  emptyLiveSheetCampaign,
  ensureSheetCampaignForJoin,
  hydrateSheetCampaigns,
  listRememberedCampaigns,
  mergeSheetCampaigns,
  normalizeCampaignName,
  rememberJoinedCampaign,
  addSheetCampaignPlaceholder,
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

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes People · Places · Things · Notes sub-tabs', () => {
    expect(CAMPAIGNS_SUB_TAB_ORDER).toEqual([
      'people',
      'places',
      'things',
      'notes',
    ])
  })

  it('normalizes campaign names for forever-tab identity', () => {
    expect(normalizeCampaignName('  Night   City ')).toBe('night city')
  })

  it('reuses a campaign tab when the table name matches (new session id)', () => {
    const first = ensureSheetCampaignForJoin([], {
      name: 'Night City',
      joinSessionId: 'sess_1',
      nowMs: 1,
    })
    expect(first.created).toBe(true)
    const second = ensureSheetCampaignForJoin(first.campaigns, {
      name: 'night city',
      joinSessionId: 'sess_2',
      nowMs: 2,
    })
    expect(second.created).toBe(false)
    expect(second.campaigns).toHaveLength(1)
    expect(second.campaign.key).toBe('night city')
    expect(second.campaign.lastJoinSessionId).toBe('sess_2')
  })

  it('creates a new tab only when the table name differs', () => {
    const a = ensureSheetCampaignForJoin([], {
      name: 'Night City',
      joinSessionId: 'a',
      nowMs: 1,
    })
    const b = ensureSheetCampaignForJoin(a.campaigns, {
      name: 'Rifts Earth',
      joinSessionId: 'b',
      nowMs: 2,
    })
    expect(b.campaigns.map((c) => c.name)).toEqual([
      'Rifts Earth',
      'Night City',
    ])
  })

  it('seeds first campaign notes from legacy playNotes', () => {
    const { campaign } = ensureSheetCampaignForJoin([], {
      name: 'Table One',
      legacyPlayNotes: 'Clue from yesterday',
      nowMs: 1,
    })
    expect(campaign.notes).toBe('Clue from yesterday')
  })

  it('does not rewrite when join name and session are unchanged', () => {
    const first = ensureSheetCampaignForJoin([], {
      name: 'Stable',
      joinSessionId: 's1',
      nowMs: 1,
    })
    const second = ensureSheetCampaignForJoin(first.campaigns, {
      name: 'Stable',
      joinSessionId: 's1',
      nowMs: 99,
    })
    expect(second.campaigns).toBe(first.campaigns)
  })

  it('remembers joins in device memory keyed by normalized name', () => {
    rememberJoinedCampaign('char_a', { id: 'camp_1', name: 'Night City' })
    rememberJoinedCampaign('char_a', {
      id: 'camp_1b',
      name: 'night city',
    })
    rememberJoinedCampaign('char_a', { id: 'camp_2', name: 'Rifts Earth' })
    expect(listRememberedCampaigns('char_a').map((p) => p.name)).toEqual([
      'Rifts Earth',
      'night city',
    ])
  })

  it('builds pills from character journals', () => {
    const campaigns = [
      emptyLiveSheetCampaign('Alpha', { nowMs: 1 }),
      emptyLiveSheetCampaign('Beta', { nowMs: 2 }),
    ]
    const pills = buildCampaignPills({
      campaigns,
      joined: { name: 'Alpha', sessionId: 'live' },
    })
    expect(pills.map((p) => p.name)).toEqual(['Alpha', 'Beta'])
  })

  it('deletes a campaign and its PPTN', () => {
    let campaigns = [
      emptyLiveSheetCampaign('Keep', { nowMs: 1 }),
      emptyLiveSheetCampaign('Drop', { notes: 'secret', nowMs: 2 }),
    ]
    const added = addSheetCampaignPlaceholder(campaigns, 'drop', {
      kind: 'place',
      name: 'Dock',
    })
    campaigns = added.campaigns
    expect(findNotes(campaigns, 'drop')).toBe('secret')
    expect(findPlaceholders(campaigns, 'drop')).toHaveLength(1)
    campaigns = deleteSheetCampaign(campaigns, 'drop')
    expect(campaigns.map((c) => c.key)).toEqual(['keep'])
    expect(campaignDeleteConfirmMessage('Drop')).toMatch(/cannot be undone/)
  })

  it('merges source into target then removes source', () => {
    let campaigns = [
      emptyLiveSheetCampaign('Target', { notes: 'Target notes', nowMs: 1 }),
      emptyLiveSheetCampaign('Source', { notes: 'Source notes', nowMs: 2 }),
    ]
    const src = addSheetCampaignPlaceholder(campaigns, 'source', {
      kind: 'person',
      name: 'Kai',
    })
    campaigns = src.campaigns
    const tgt = addSheetCampaignPlaceholder(campaigns, 'target', {
      kind: 'place',
      name: 'Pier',
    })
    campaigns = tgt.campaigns

    campaigns = mergeSheetCampaigns(campaigns, 'source', 'target', 9)
    expect(campaigns).toHaveLength(1)
    expect(campaigns[0]!.key).toBe('target')
    expect(campaigns[0]!.notes).toContain('Target notes')
    expect(campaigns[0]!.notes).toContain('Source notes')
    expect(campaigns[0]!.notes).toContain('Merged from Source')
    expect(campaigns[0]!.placeholders.map((p) => p.name).sort()).toEqual([
      'Kai',
      'Pier',
    ])
    expect(campaignMergeConfirmMessage('Source', 'Target')).toMatch(
      /source campaign tab is removed/i,
    )
  })

  it('remaps colliding placeholder ids on merge', () => {
    const sharedId = 'person_shared'
    const target = {
      ...emptyLiveSheetCampaign('Target', { nowMs: 1 }),
      placeholders: [
        {
          id: sharedId,
          kind: 'person' as const,
          name: 'Target Person',
          notes: '',
          createdAtMs: 1,
        },
      ],
    }
    const source = {
      ...emptyLiveSheetCampaign('Source', {
        notes: `See [[person:${sharedId}|Src]]`,
        nowMs: 2,
      }),
      placeholders: [
        {
          id: sharedId,
          kind: 'person' as const,
          name: 'Source Person',
          notes: '',
          createdAtMs: 2,
        },
      ],
    }
    const merged = mergeSheetCampaigns([target, source], 'source', 'target', 3)
    expect(merged).toHaveLength(1)
    expect(merged[0]!.placeholders).toHaveLength(2)
    const remapped = merged[0]!.placeholders.find(
      (p) => p.name === 'Source Person',
    )
    expect(remapped?.id).not.toBe(sharedId)
    expect(merged[0]!.notes).toContain(`[[person:${remapped!.id}|Src]]`)
  })

  it('maps content kinds to Campaigns sub-tabs', () => {
    expect(campaignsSubTabForContentKind('person')).toBe('people')
    expect(campaignsSubTabForContentKind('place')).toBe('places')
    expect(campaignsSubTabForContentKind('thing')).toBe('things')
    expect(campaignsSubTabForContentKind('note')).toBe('notes')
  })

  it('hydrates sheet campaigns from save JSON', () => {
    const rows = hydrateSheetCampaigns([
      {
        key: 'Night City',
        name: 'Night City',
        notes: 'hi',
        placeholders: [],
        createdAtMs: 1,
        updatedAtMs: 1,
      },
    ])
    expect(rows[0]!.key).toBe('night city')
  })
})

function findNotes(campaigns: ReturnType<typeof hydrateSheetCampaigns>, key: string) {
  return campaigns.find((c) => c.key === key)?.notes
}

function findPlaceholders(
  campaigns: ReturnType<typeof hydrateSheetCampaigns>,
  key: string,
) {
  return campaigns.find((c) => c.key === key)?.placeholders ?? []
}
