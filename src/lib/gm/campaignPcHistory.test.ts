import { describe, expect, it } from 'vitest'
import { characterFixture } from '../../data/characterFixture'
import { ensureCharacterRoot } from '../characterRoot'
import { createGmSession } from './sessionModel'
import {
  campaignPcHistoryOptionLabel,
  deleteCampaignPcHistoryEntry,
  hydrateCampaignPcHistory,
  isSpawnedCharacterJson,
  setCampaignPcHistoryComment,
  upsertCampaignPcHistory,
} from './campaignPcHistory'
import type { CharacterRootState } from '../../types'

function spawnedSave(
  overrides: Partial<CharacterRootState> = {},
): CharacterRootState {
  return ensureCharacterRoot(
    {
      ...characterFixture,
      id: 'char_history_1',
      name: 'Scout',
      isFinalized: true,
      ...overrides,
    },
    {
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    },
  )
}

describe('campaign PC history', () => {
  it('rejects drafts from history membership', () => {
    const draft = spawnedSave({ isFinalized: false })
    expect(isSpawnedCharacterJson(draft)).toBe(false)
    let s = createGmSession({ name: 'Table', hostGenreId: 'nightbane' })
    s = upsertCampaignPcHistory(s, {
      characterId: draft.id,
      characterJson: draft,
      playerLabel: 'Alex',
    })
    expect(s.campaignPcHistory).toEqual([])
  })

  it('upserts unique characters and refreshes latest snapshot', () => {
    let s = createGmSession({ name: 'Table', hostGenreId: 'nightbane' })
    const first = spawnedSave({ name: 'Scout', level: 1 })
    s = upsertCampaignPcHistory(s, {
      characterId: first.id,
      characterJson: first,
      playerLabel: 'Alex',
      lastSeenAtMs: 1000,
    })
    expect(s.campaignPcHistory).toHaveLength(1)
    expect(s.campaignPcHistory[0]?.characterName).toBe('Scout')
    expect(s.campaignPcHistory[0]?.playerLabel).toBe('Alex')

    const secondChar = spawnedSave({
      id: 'char_history_2',
      name: 'Mage',
    })
    s = upsertCampaignPcHistory(s, {
      characterId: secondChar.id,
      characterJson: secondChar,
      playerLabel: 'Alex',
      lastSeenAtMs: 2000,
    })
    expect(s.campaignPcHistory).toHaveLength(2)

    const refreshed = spawnedSave({ name: 'Scout Prime', level: 4 })
    s = setCampaignPcHistoryComment(s, first.id, 'Trustworthy')
    s = upsertCampaignPcHistory(s, {
      characterId: first.id,
      characterJson: refreshed,
      playerLabel: 'Alex',
      lastSeenAtMs: 3000,
    })
    expect(s.campaignPcHistory).toHaveLength(2)
    const entry = s.campaignPcHistory.find((row) => row.characterId === first.id)
    expect(entry?.characterName).toBe('Scout Prime')
    expect(entry?.gmComment).toBe('Trustworthy')
    expect(entry?.lastSeenAtMs).toBe(3000)
    expect(entry?.characterJson.level).toBe(4)
  })

  it('deletes history rows without touching party seats', () => {
    let s = createGmSession({ name: 'Table', hostGenreId: 'nightbane' })
    const save = spawnedSave()
    s = upsertCampaignPcHistory(s, {
      characterId: save.id,
      characterJson: save,
    })
    s = {
      ...s,
      partyCharacterIds: [save.id],
    }
    s = deleteCampaignPcHistoryEntry(s, save.id)
    expect(s.campaignPcHistory).toEqual([])
    expect(s.partyCharacterIds).toEqual([save.id])
  })

  it('hydrates missing campaignPcHistory on older saves', () => {
    const raw = createGmSession({ name: 'Old', hostGenreId: 'rifts' })
    const { campaignPcHistory: _drop, ...without } = raw
    const hydrated = hydrateCampaignPcHistory(
      without as typeof raw,
    )
    expect(hydrated.campaignPcHistory).toEqual([])
  })

  it('formats option labels with optional player name', () => {
    expect(
      campaignPcHistoryOptionLabel({
        characterId: 'c1',
        characterName: 'Scout',
        playerLabel: 'Alex',
        lastSeenAtMs: 1,
        gmComment: '',
        characterJson: spawnedSave(),
      }),
    ).toBe('Scout (Alex)')
  })
})
