import { describe, expect, it } from 'vitest'
import { createGmSession, addNpcInstance, addPartyMember } from './sessionModel'
import { createNpcFromArchetype } from './npcInstance'
import {
  addCharacterToMelee,
  addNpcInstanceToMelee,
  hydrateMeleeEngagement,
  listMeleeNpcCandidates,
  listMeleePcCandidates,
  removeCharacterFromMelee,
} from './meleeEngagement'
import {
  attachSeatCharacter,
  emptyPresence,
  grantOrReclaimSeat,
} from './sessionPresence'
import type { CatalogEncounterArchetype } from '../../data/library/encounterArchetypeCatalogLoader'
import type { GmPartyObserverSlice } from './partyObserver'

const fodder = {
  id: 'encounter_test_thug',
  name: 'Test Thug',
  description: 'Unit test archetype',
  gameSystems: ['nightbane'],
  sources: [{ gameSystem: 'nightbane', reference: 'Test', pageNumber: 1 }],
  tags: ['test'],
  numberAppearing: { formula: '1' },
  alignmentNotes: 'any',
  vitals: { sdc: 18, hp: 12 },
  handToHand: { skillId: 'hth_basic', attacksPerMelee: 3 },
  levelOfExperience: { defaultLevel: 1 },
  modifiers: { strike: 2, initiative: 1, parry: 1 },
  weaponProficiencies: [],
  equipment: [],
  horrorFactorMorale: undefined,
  dispositionNotes: [],
  catalogGenreId: 'nightbane',
} as unknown as CatalogEncounterArchetype

function slice(characterId: string, name: string): GmPartyObserverSlice {
  return {
    characterId,
    name,
    creationGenreId: 'nightbane',
    creationGenreLabel: 'Nightbane',
    hostGenreId: 'nightbane',
    hostGenreLabel: 'Nightbane',
    crossGenre: false,
    conversionPolicy: 'disable_non_native',
    conversionNote: '',
    lockedSkillCount: 0,
    supportsDualForm: false,
    viewForm: 'primary',
    level: 1,
    hpCurrent: 10,
    hpMax: 10,
    sdcCurrent: 20,
    sdcMax: 20,
    ppeCurrent: 0,
    ppeMax: 0,
    ispCurrent: 0,
    ispMax: 0,
    attributes: {
      iq: 10,
      me: 10,
      ma: 10,
      pp: 10,
      pe: 10,
      pb: 10,
      spd: 10,
      ps: 10,
    },
    hthSkillName: null,
    abilities: [],
    perceptionBonus: 0,
    trustIntimidate: 0,
    charmImpress: 0,
    maxApm: 4,
    initiativeBonus: 0,
    strikeBonus: 0,
    parryBonus: 0,
    dodgeBonus: 0,
    horrorAura: null,
    horrorSaveBonus: 0,
    saveSummaries: [],
  }
}

describe('meleeEngagement', () => {
  it('lists joined PCs and People NPCs not yet in Melee', () => {
    let s = createGmSession({ name: 'T', hostGenreId: 'nightbane' })
    s = addPartyMember(s, 'char_pc', 'Joined')
    s = addPartyMember(s, 'char_local', 'Local NPC')
    const npc = createNpcFromArchetype(fodder)
    s = addNpcInstance(s, npc)

    let presence = grantOrReclaimSeat(emptyPresence('play_1'), {
      deviceId: 'dev_a',
      displayName: 'Alex',
    })
    presence = attachSeatCharacter(presence, 'dev_a', 'char_pc')

    const party = [slice('char_pc', 'Joined'), slice('char_local', 'Local NPC')]
    expect(listMeleePcCandidates(s, party, presence.seats)).toEqual([
      expect.objectContaining({ characterId: 'char_pc', kind: 'pc' }),
    ])
    expect(listMeleeNpcCandidates(s, party, presence.seats)).toEqual([
      expect.objectContaining({ characterId: 'char_local', kind: 'local_npc' }),
      expect.objectContaining({
        npcInstanceId: npc.instanceId,
        kind: 'fodder',
      }),
    ])

    s = addCharacterToMelee(s, 'char_pc')
    s = addCharacterToMelee(s, 'char_local')
    s = addNpcInstanceToMelee(s, npc.instanceId)
    expect(listMeleePcCandidates(s, party, presence.seats)).toEqual([])
    expect(listMeleeNpcCandidates(s, party, presence.seats)).toEqual([])
  })

  it('hydrates missing melee arrays on older saves', () => {
    const s = createGmSession({ name: 'T', hostGenreId: 'nightbane' })
    const legacy = {
      ...s,
      combat: {
        round: 1,
        initiativeLocked: false,
        activeHfEmit: null,
      },
    }
    const hydrated = hydrateMeleeEngagement(legacy as typeof s)
    expect(hydrated.combat.meleeCharacterIds).toEqual([])
    expect(hydrated.combat.meleeNpcInstanceIds).toEqual([])
  })

  it('removes a character from melee engagement', () => {
    let s = createGmSession({ name: 'T', hostGenreId: 'nightbane' })
    s = addPartyMember(s, 'char_pc', 'Joined')
    s = addCharacterToMelee(s, 'char_pc')
    s = removeCharacterFromMelee(s, 'char_pc')
    expect(s.combat.meleeCharacterIds).toEqual([])
  })
})
