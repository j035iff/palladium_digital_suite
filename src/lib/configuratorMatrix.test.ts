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
  buildConfiguratorColumnRows,
  buildConfiguratorScrollLayout,
  configuratorAlignmentLabel,
  formatOccAttributeRequirements,
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

  it('labels alignments for configurator display', () => {
    expect(configuratorAlignmentLabel('')).toBe('Select Alignment')
    expect(configuratorAlignmentLabel('Principled')).toBe('Good - Principled')
    expect(configuratorAlignmentLabel('Unprincipled')).toBe('Selfish - Unprincipled')
    expect(configuratorAlignmentLabel('Diabolic')).toBe('Evil - Diabolic')
  })

  it('scroll layout pins selection and omits it from scroll list', () => {
    const layout = buildConfiguratorScrollLayout(
      [agentOcc, nightbaneOnlyOcc],
      (occ) =>
        assessOccConfiguratorTier(
          occ,
          { activeOccTags: [], selectedRaceId: 'race_human' },
          raceMap,
        ),
      'occ_agent',
      'Select O.C.C.',
    )
    expect(layout.pinned?.item.id).toBe('occ_agent')
    expect(layout.scrollItems.map((o) => o.id)).toEqual(['occ_nightbane_only'])
  })

  it('always pins selected occ directly under placeholder', () => {
    const rows = buildConfiguratorColumnRows(
      [agentOcc, nightbaneOnlyOcc],
      (occ) =>
        assessOccConfiguratorTier(
          occ,
          { activeOccTags: [], selectedRaceId: 'race_human' },
          raceMap,
        ),
      'occ_agent',
      'Select O.C.C.',
    )
    expect(rows[0]?.kind).toBe('placeholder')
    expect(rows[1]?.kind).toBe('item')
    if (rows[1]?.kind === 'item') {
      expect(rows[1].item.id).toBe('occ_agent')
      expect(rows[1].filterMismatch).toBe(false)
    }
  })

  it('pins selected occ with filterMismatch when tier 3', () => {
    const rows = buildConfiguratorColumnRows(
      [agentOcc, nightbaneOnlyOcc],
      (occ) =>
        assessOccConfiguratorTier(
          occ,
          { activeOccTags: ['magic'], selectedRaceId: 'race_human' },
          raceMap,
        ),
      'occ_agent',
      'Select O.C.C.',
    )
    expect(rows[0]?.kind).toBe('placeholder')
    expect(rows[1]?.kind).toBe('item')
    if (rows[1]?.kind === 'item') {
      expect(rows[1].item.id).toBe('occ_agent')
      expect(rows[1].filterMismatch).toBe(true)
    }
  })

  it('formats attribute requirements on occ rows', () => {
    const withReqs = {
      ...agentOcc,
      attributeRequirements: { iq: 12, pe: 14 },
    } as PalladiumOcc
    expect(formatOccAttributeRequirements(withReqs)).toMatch(/I\.Q\. 12\+/)
    expect(formatOccAttributeRequirements(withReqs)).toMatch(/P\.E\. 14\+/)
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
