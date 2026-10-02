import { describe, expect, it } from 'vitest'
import { characterFixture } from '../../data/characterFixture'
import { ensureCharacterRoot } from '../characterRoot'
import { upsertCampaignPcHistory } from './campaignPcHistory'
import {
  addPlaceholder,
  createPlaceholderEntity,
  resolveContentLinkTarget,
  searchAllLinkableEntities,
  searchLinkableEntities,
} from './narrativePlaceholders'
import { createGmSession } from './sessionModel'
import type { GmNpcInstance } from './sessionTypes'

function sessionWithNpc() {
  let s = createGmSession({
    name: 'Test',
    hostGenreId: 'nightbane',
  })
  const npc: GmNpcInstance = {
    instanceId: 'npc_live',
    archetypeId: 'arch',
    catalogGenreId: 'nightbane',
    displayName: 'Guard',
    notes: '',
    hpMax: 10,
    hpCurrent: 10,
    sdcMax: 20,
    sdcCurrent: 20,
    maxApm: 3,
    apmSpent: 0,
    initiativeRoll: null,
  }
  s = { ...s, npcs: [npc], partyCharacterIds: ['pc_1'] }
  return s
}

describe('narrativePlaceholders', () => {
  it('creates and finds stubs by kind', () => {
    let s = createGmSession({ name: 'Test', hostGenreId: 'nightbane' })
    const place = createPlaceholderEntity({ kind: 'place', name: 'Pier' })
    s = addPlaceholder(s, place)
    expect(
      resolveContentLinkTarget(s, 'place', place.id, 'Pier').status,
    ).toBe('ok')
  })

  it('resolves live NPCs and party PCs without placeholders', () => {
    const s = sessionWithNpc()
    expect(
      resolveContentLinkTarget(s, 'npc', 'npc_live', 'Guard'),
    ).toMatchObject({ status: 'ok', source: 'npc', name: 'Guard' })
    expect(
      resolveContentLinkTarget(s, 'pc', 'pc_1', 'Hero', {
        partyNamesById: new Map([['pc_1', 'Hero']]),
      }),
    ).toMatchObject({ status: 'ok', source: 'pc', name: 'Hero' })
  })

  it('explains missing targets (Radical Visibility)', () => {
    const s = createGmSession({ name: 'Test', hostGenreId: 'nightbane' })
    const missing = resolveContentLinkTarget(
      s,
      'thing',
      'thing_gone',
      'Locket',
    )
    expect(missing.status).toBe('missing')
    if (missing.status === 'missing') {
      expect(missing.reason).toMatch(/missing or deleted/i)
    }
  })

  it('searches placeholders and live rows', () => {
    let s = sessionWithNpc()
    const person = createPlaceholderEntity({ kind: 'person', name: 'Kai' })
    s = addPlaceholder(s, person)
    expect(searchLinkableEntities(s, 'person', 'ka')).toEqual([
      { id: person.id, name: 'Kai', source: 'placeholder' },
    ])
    expect(searchLinkableEntities(s, 'npc', 'guard')).toEqual([
      { id: 'npc_live', name: 'Guard', source: 'npc' },
    ])
  })

  it('searches across kinds for @ mention typeahead', () => {
    let s = sessionWithNpc()
    const place = createPlaceholderEntity({
      kind: 'place',
      name: 'Old Chicago',
    })
    const thing = createPlaceholderEntity({ kind: 'thing', name: 'Old Key' })
    s = addPlaceholder(s, place)
    s = addPlaceholder(s, thing)
    const hits = searchAllLinkableEntities(s, 'old', {
      partyNamesById: new Map([['pc_1', 'Olivia']]),
    })
    expect(hits.map((row) => row.name)).toEqual(['Old Chicago', 'Old Key'])
    expect(hits[0]?.kind).toBe('place')
    expect(
      searchAllLinkableEntities(s, 'guard').some(
        (row) => row.kind === 'npc' && row.id === 'npc_live',
      ),
    ).toBe(true)
  })

  it('resolves and searches campaign history PCs via pc kind', () => {
    let s = createGmSession({ name: 'Test', hostGenreId: 'nightbane' })
    const save = ensureCharacterRoot(
      {
        ...characterFixture,
        name: 'Scout History',
        isFinalized: true,
      },
      { creationGenreId: 'nightbane', hostGenreId: 'nightbane' },
    )
    s = upsertCampaignPcHistory(s, {
      characterId: save.id,
      characterJson: save,
      playerLabel: 'Ada',
    })
    expect(
      resolveContentLinkTarget(s, 'pc', save.id, 'Scout History'),
    ).toMatchObject({ status: 'ok', source: 'pc', name: 'Scout History' })
    expect(
      searchLinkableEntities(s, 'pc', 'scout').some(
        (row) => row.id === save.id,
      ),
    ).toBe(true)
    expect(
      searchAllLinkableEntities(s, 'scout').some(
        (row) => row.kind === 'pc' && row.id === save.id,
      ),
    ).toBe(true)
  })
})
