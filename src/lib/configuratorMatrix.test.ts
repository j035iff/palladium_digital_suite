import { describe, expect, it } from 'vitest'
import type { PalladiumOcc, Race } from '../types'
import {
  assessOccConfiguratorTier,
  assessRaceConfiguratorTier,
  assessAlignmentConfiguratorTier,
  assessConfiguratorPairConflict,
  describeRaceOccConflict,
  describeOccAlignmentConflict,
  CONFIGURATOR_ALIGNMENT_UNDECIDED,
} from './configuratorMatrix'

const human: Race = {
  id: 'race_human',
  name: 'Human',
  description: 'Test human',
  raceAudience: 'player',
  gameSystems: ['nightbane'],
  sources: [],
  canPickOcc: true,
  attributes: {
    iq: '3D6',
    me: '3D6',
    ma: '3D6',
    ps: '3D6',
    pp: '3D6',
    pe: '3D6',
    pb: '3D6',
    spd: '3D6',
  },
  strengthCategory: 'standard',
  vitals: { hpFormula: 'PE + 1D6' },
  psionics: { capabilityType: 'standard', naturalIspFormula: '0' },
  occLimitations: { forbiddenOccIds: [], forbiddenCategories: [] },
  innateSkills: [],
  innateBonuses: { modifiers: {} },
  demographics: { excludedAlignments: ['Diabolic'] },
}

const agentOcc = {
  id: 'occ_agent',
  name: 'Agent',
  description: 'Test',
  gameSystems: ['nightbane'],
  sources: [],
  occType: 'law',
  tags: ['government', 'tactical'],
  occSkillsCore: [],
  occRelatedSkills: {},
  secondarySkills: {},
  wpRules: {},
  handToHandRules: {},
  progression: { characterOccCategory: 'standard' },
} as unknown as PalladiumOcc

const nightbaneOnlyOcc: PalladiumOcc = {
  ...agentOcc,
  id: 'occ_nightbane_only',
  name: 'Nightbane Only',
  raceRestrictions: { allowed: ['race_nightbane'] },
}

const diabolicOcc: PalladiumOcc = {
  ...agentOcc,
  id: 'occ_diabolic_only',
  name: 'Diabolic Only',
  alignmentRestrictions: { allowed: ['Diabolic', 'Miscreant'] },
}

const raceMap = new Map<string, Race>([['race_human', human]])
const occMap = new Map<string, PalladiumOcc>([
  ['occ_agent', agentOcc],
  ['occ_nightbane_only', nightbaneOnlyOcc],
  ['occ_diabolic_only', diabolicOcc],
])

describe('configuratorMatrix', () => {
  it('flags race–O.C.C. cross conflict as Tier 2', () => {
    const reason = describeRaceOccConflict(human, nightbaneOnlyOcc)
    expect(reason).toMatch(/Requires/i)
    const tier = assessOccConfiguratorTier(
      nightbaneOnlyOcc,
      { activeOccTags: [], selectedRaceId: 'race_human' },
      raceMap,
    )
    expect(tier.tier).toBe(2)
    expect(tier.conflictReason).toBeTruthy()
  })

  it('sorts tag mismatch to Tier 3 when no cross conflict', () => {
    const tier = assessOccConfiguratorTier(
      agentOcc,
      { activeOccTags: ['magic'], selectedRaceId: 'race_human' },
      raceMap,
    )
    expect(tier.tier).toBe(3)
    expect(tier.tagMismatchReason).toMatch(/Not a magic/)
  })

  it('Tier 2 beats tag mismatch when both apply', () => {
    const tier = assessOccConfiguratorTier(
      nightbaneOnlyOcc,
      { activeOccTags: ['magic'], selectedRaceId: 'race_human' },
      raceMap,
    )
    expect(tier.tier).toBe(2)
  })

  it('filters alignment when O.C.C. restricts codes', () => {
    const tier = assessAlignmentConfiguratorTier(
      'Principled',
      { activeOccTags: [], selectedOccId: 'occ_diabolic_only' },
      raceMap,
      occMap,
    )
    expect(tier.tier).toBe(2)
    expect(describeOccAlignmentConflict(diabolicOcc, 'Principled')).toMatch(
      /requires/i,
    )
  })

  it('skips alignment cross-filter when undecided', () => {
    const tier = assessRaceConfiguratorTier(
      human,
      {
        activeOccTags: [],
        selectedAlignment: CONFIGURATOR_ALIGNMENT_UNDECIDED,
        selectedOccId: 'occ_diabolic_only',
      },
      occMap,
    )
    expect(tier.tier).toBe(1)
  })

  it('reports pair conflict for invalid human + nightbane-only O.C.C.', () => {
    expect(
      assessConfiguratorPairConflict(human, nightbaneOnlyOcc, 'Principled'),
    ).toBeTruthy()
  })

  it('race tier 2 when alignment excluded by race demographics', () => {
    const tier = assessRaceConfiguratorTier(
      human,
      { activeOccTags: [], selectedAlignment: 'Diabolic' },
      occMap,
    )
    expect(tier.tier).toBe(2)
  })
})
