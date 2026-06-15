import { describe, expect, it } from 'vitest'
import { getPalladiumTalentById } from '../data/library/registry'
import {
  formatTalentActivationCost,
  formatTalentPpeAcquireCost,
} from './talentDisplay'
import {
  assessTalentSelectionGate,
  collectCharacterMorphusTableIds,
  CREATION_CHARACTER_LEVEL,
  groupEntriesByTalentLevelGate,
  readStructuredMorphusTablePrerequisites,
  talentCatalogTier,
  talentMinimumLevelRequirement,
} from './talentSelectionGates'
import type { MorphusForgeSlotState, MorphusForgeState } from '../types'

describe('talentDisplay', () => {
  it('formats P.P.E. acquire and activation from catalog rows', () => {
    const talent = getPalladiumTalentById('talent_a_face_in_the_crowd')
    expect(talent).toBeDefined()
    expect(formatTalentPpeAcquireCost(talent!.ppe)).toBe('15')
    expect(formatTalentActivationCost(talent!.ppe, talent!.activation?.cost)).toBe('10')
  })
})

describe('talentSelectionGates', () => {
  it('classifies common vs elite tiers', () => {
    const common = getPalladiumTalentById('talent_all_nighter')
    const elite = getPalladiumTalentById('talent_a_face_in_the_crowd')
    expect(common).toBeDefined()
    expect(elite).toBeDefined()
    expect(talentCatalogTier(common!)).toBe('common')
    expect(talentCatalogTier(elite!)).toBe('elite')
  })

  it('blocks creation picks above level 1', () => {
    const talent = getPalladiumTalentById('talent_all_nighter')
    expect(talent).toBeDefined()
    const gate = assessTalentSelectionGate(talent!, {
      characterLevel: CREATION_CHARACTER_LEVEL,
      morphusTableIds: new Set(),
      selectedTalentIds: [],
      spellCap: 4,
    })
    expect(gate.selectable).toBe(false)
    expect(gate.reason).toMatch(/level 3/i)
  })

  it('allows elite talents when morphus tables and level match', () => {
    const talent = getPalladiumTalentById('talent_beyond_the_call')
    expect(talent).toBeDefined()
    expect(readStructuredMorphusTablePrerequisites(talent!).length).toBeGreaterThan(0)
    const gate = assessTalentSelectionGate(talent!, {
      characterLevel: 4,
      morphusTableIds: new Set(['modern_soldier']),
      selectedTalentIds: [],
      spellCap: 4,
    })
    expect(gate.selectable).toBe(true)
  })

  it('flags elite morphus table mismatch for hide filter', () => {
    const talent = getPalladiumTalentById('talent_beyond_the_call')
    expect(talent).toBeDefined()
    const gate = assessTalentSelectionGate(talent!, {
      characterLevel: 4,
      morphusTableIds: new Set(['animal']),
      selectedTalentIds: [],
      spellCap: 4,
    })
    expect(gate.selectable).toBe(false)
    expect(gate.morphusTraitMismatch).toBe(true)
  })

  it('collects branch table ids from morphus slot state', () => {
    const forgeState: MorphusForgeState = {
      path: 'appearance',
      appearanceEntryId: 'anthromorph',
    }
    const slotState: MorphusForgeSlotState = {
      branchTableIds: {
        'plan:0/choice:0': 'angelic',
      },
    }
    const ids = collectCharacterMorphusTableIds(forgeState, slotState)
    expect(ids.has('angelic')).toBe(true)
  })

  it('groups talents with no level gate first, then by ascending level', () => {
    const noGate = getPalladiumTalentById('talent_jam_senses')
    const level3 = getPalladiumTalentById('talent_all_nighter')
    const level5 = getPalladiumTalentById('talent_chronosphere')
    expect(noGate).toBeDefined()
    expect(level3).toBeDefined()
    expect(level5).toBeDefined()
    expect(talentMinimumLevelRequirement(noGate!)).toBe(1)
    expect(talentMinimumLevelRequirement(level3!)).toBe(3)
    expect(talentMinimumLevelRequirement(level5!)).toBe(5)

    const sections = groupEntriesByTalentLevelGate([
      { talent: level5!, gate: { selectable: false, locked: true } },
      { talent: level3!, gate: { selectable: false, locked: true } },
      { talent: noGate!, gate: { selectable: true, locked: false } },
    ])

    expect(sections.map((s) => s.kind)).toEqual(['available', 'level_gate', 'level_gate'])
    expect(sections[0]?.entries.map((e) => e.talent.id)).toEqual([noGate!.id])
    expect(sections[1]?.level).toBe(3)
    expect(sections[1]?.entries.map((e) => e.talent.id)).toEqual([level3!.id])
    expect(sections[2]?.level).toBe(5)
    expect(sections[2]?.entries.map((e) => e.talent.id)).toEqual([level5!.id])
  })
})
