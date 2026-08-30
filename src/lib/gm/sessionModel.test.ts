import { describe, expect, it } from 'vitest'
import { createGmEnvelope, isGmEnvelope, GM_PROTOCOL_VERSION } from './sessionMessages'
import { createGmSession } from './sessionModel'
import {
  addNpcInstance,
  addPartyMember,
  emitHorrorFactor,
  lockInitiative,
  recordNpcStrike,
  recordPartyHfSave,
  setNpcInitiativeRoll,
  setPartyInitiativeRoll,
  spendNpcApm,
  startNewMeleeRound,
} from './sessionModel'
import { createNpcFromArchetype, parseEncounterVital } from './npcInstance'
import { assembleGmCombatRoster, sortCombatRoster } from './combatRoster'
import { DEFAULT_PARTY_OVERLAY } from './sessionTypes'
import type { CatalogEncounterArchetype } from '../../data/library/encounterArchetypeCatalogLoader'
import type { GmCombatRosterRow } from './combatRoster'

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
  equipment: [{ label: 'Knife', damageFormula: '1D6' }],
  horrorFactorMorale: {
    saveTarget: 10,
    useNightbaneHorrorFactor: true,
    notes: 'Test emit',
  },
  dispositionNotes: [],
  catalogGenreId: 'nightbane',
} as CatalogEncounterArchetype

function sessionWithParty() {
  let s = createGmSession({ name: 'Table 1', hostGenreId: 'nightbane' })
  s = addPartyMember(s, 'char_alex', 'Alex')
  const npc = createNpcFromArchetype(fodder)
  s = addNpcInstance(s, npc)
  return { s, npcId: npc.instanceId }
}

describe('GM protocol envelopes', () => {
  it('stamps v1 envelopes that the type guard accepts', () => {
    const env = createGmEnvelope('combat.hfEmit', 'sess_1', {
      npcInstanceId: 'npc_1',
      saveTarget: 12,
      useNightbaneHorrorFactor: true,
    })
    expect(env.v).toBe(GM_PROTOCOL_VERSION)
    expect(isGmEnvelope(env)).toBe(true)
    expect(isGmEnvelope({ type: 'nope' })).toBe(false)
  })
})

describe('encounter vitals + spawn', () => {
  it('parses numeric and leading-digit string vitals', () => {
    expect(parseEncounterVital(12)).toBe(12)
    expect(parseEncounterVital('2D6+8')).toBe(2)
    expect(parseEncounterVital('n/a')).toBe(0)
  })

  it('spawns fodder with catalog APM and full vitals', () => {
    const npc = createNpcFromArchetype(fodder)
    expect(npc.maxApm).toBe(3)
    expect(npc.hpCurrent).toBe(12)
    expect(npc.sdcCurrent).toBe(18)
    expect(npc.apmSpent).toBe(0)
  })
})

describe('session combat economy', () => {
  it('sorts initiative descending and parks unrolled combatants last', () => {
    const rows: GmCombatRosterRow[] = [
      {
        key: 'pc:a',
        kind: 'pc',
        name: 'Zed',
        initiativeRoll: 10,
        initiativeBonus: 1,
        initiativeTotal: 11,
        maxApm: 4,
        apmSpent: 0,
        hfOutcome: null,
      },
      {
        key: 'npc:b',
        kind: 'npc',
        name: 'Brute',
        initiativeRoll: 18,
        initiativeBonus: 2,
        initiativeTotal: 20,
        maxApm: 2,
        apmSpent: 0,
        hfOutcome: null,
      },
      {
        key: 'pc:c',
        kind: 'pc',
        name: 'Ann',
        initiativeRoll: null,
        initiativeBonus: 3,
        initiativeTotal: null,
        maxApm: 5,
        apmSpent: 0,
        hfOutcome: null,
      },
    ]
    const sorted = sortCombatRoster(rows)
    expect(sorted.map((r) => r.name)).toEqual(['Brute', 'Zed', 'Ann'])
  })

  it('locks PC initiative entry and still allows NPC APM spend', () => {
    let { s, npcId } = sessionWithParty()
    s = setPartyInitiativeRoll(s, 'char_alex', 14)
    s = setNpcInitiativeRoll(s, npcId, 9)
    s = lockInitiative(s)
    const lockedPc = setPartyInitiativeRoll(s, 'char_alex', 20)
    const lockedNpc = setNpcInitiativeRoll(s, npcId, 20)
    expect(lockedPc.partyOverlays.char_alex?.initiativeRoll).toBe(14)
    expect(lockedNpc.npcs[0]?.initiativeRoll).toBe(9)
    const spent = spendNpcApm(s, npcId, 1)
    expect(spent.npcs[0]?.apmSpent).toBe(1)
  })

  it('H.F. emit records saves without spending NPC APM', () => {
    let { s, npcId } = sessionWithParty()
    const npc = s.npcs[0]!
    s = spendNpcApm(s, npcId, 1)
    s = emitHorrorFactor(s, npc, 10, true, 'Test emit')
    expect(s.combat.activeHfEmit?.saveTarget).toBe(10)
    expect(s.partyOverlays.char_alex?.hfOutcome).toBe('pending')
    const result = recordPartyHfSave(s, 'char_alex', 'Alex', 8, 0)
    expect(result).not.toBeNull()
    expect(result!.passed).toBe(false)
    expect(result!.session.partyOverlays.char_alex?.hfOutcome).toBe('failed')
    expect(result!.session.npcs[0]?.apmSpent).toBe(1)
    const pcRow = assembleGmCombatRoster({
      session: result!.session,
      party: [
        {
          characterId: 'char_alex',
          name: 'Alex',
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
        },
      ],
      overlays: result!.session.partyOverlays,
      archetypesByKey: new Map([['nightbane:encounter_test_thug', fodder]]),
    })
    const player = pcRow.find((r) => r.kind === 'pc')
    expect(player?.apmSpent).toBe(0)
    expect(player?.hfOutcome).toBe('failed')
  })

  it('new melee round refills NPC APM and does not invent PC APM tracking', () => {
    let { s, npcId } = sessionWithParty()
    s = spendNpcApm(s, npcId, 2)
    s = startNewMeleeRound(s)
    expect(s.combat.round).toBe(2)
    expect(s.npcs[0]?.apmSpent).toBe(0)
    expect(s.partyOverlays.char_alex).toMatchObject({
      ...DEFAULT_PARTY_OVERLAY,
      initiativeRoll: null,
    })
  })

  it('math-in strike logs die + bonus without mutating APM', () => {
    let { s, npcId } = sessionWithParty()
    const npc = s.npcs[0]!
    s = recordNpcStrike(s, npc, 14, 2)
    expect(s.npcs.find((n) => n.instanceId === npcId)?.apmSpent).toBe(0)
    expect(s.eventLog[0]?.text).toContain('14 + 2 = 16')
  })
})
