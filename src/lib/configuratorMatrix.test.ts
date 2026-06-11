import { describe, expect, it } from 'vitest'
import type { PalladiumOcc, Race } from '../types'
import {
  assessOccConfiguratorTier,
  assessRaceConfiguratorTier,
  assessAlignmentConfiguratorTier,
  assessConfiguratorPairConflict,
  describeRaceOccConflict,
  describeRaceAlignmentConflict,
  describeOccAlignmentConflict,
  describeAlignmentSelectionConflict,
  formatOccAlignmentRestrictionNote,
  formatRaceAlignmentRestrictionNote,
  buildConfiguratorColumnRows,
  buildConfiguratorScrollLayout,
  configuratorAlignmentLabel,
  filterConfiguratorOccPoolForRace,
  filterConfiguratorListForActiveFilter,
  filterConfiguratorRacePoolForOcc,
  formatOccAttributeRequirements,
  isOccCompatibleWithRace,
  occMatchesConfiguratorTag,
  summarizeAlignmentNames,
} from './configuratorMatrix'
import {
  newFilterGroupNode,
  newFilterNotNode,
  newFilterPredicateNode,
} from './configuratorFilterExpression'

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

const psychicOcc: PalladiumOcc = {
  ...agentOcc,
  id: 'occ_psychic',
  name: 'Psychic Agent',
  occType: 'psychic',
  tags: ['psychic', 'tactical'],
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
      { configuratorFilter: null, selectedRaceId: 'race_human' },
      raceMap,
    )
    expect(tier.tier).toBe(2)
    expect(tier.conflictReason).toBeTruthy()
  })

  it('sorts tag mismatch to Tier 3 when no cross conflict', () => {
    const tier = assessOccConfiguratorTier(
      agentOcc,
      {
        configuratorFilter: newFilterGroupNode('and', [
          newFilterPredicateNode('occ', 'magic'),
        ]),
        selectedRaceId: 'race_human',
      },
      raceMap,
    )
    expect(tier.tier).toBe(3)
    expect(tier.tagMismatchReason).toMatch(/Does not match filter.*magic/i)
  })

  it('Only psychic keeps psychic O.C.C.s at Tier 1 and greys others', () => {
    const psychicTier = assessOccConfiguratorTier(
      psychicOcc,
      {
        configuratorFilter: newFilterGroupNode('and', [
          newFilterPredicateNode('occ', 'psychic'),
        ]),
        selectedRaceId: 'race_human',
      },
      raceMap,
    )
    expect(psychicTier.tier).toBe(1)
    expect(occMatchesConfiguratorTag(psychicOcc, 'psychic')).toBe(true)

    const agentTier = assessOccConfiguratorTier(
      agentOcc,
      {
        configuratorFilter: newFilterGroupNode('and', [
          newFilterPredicateNode('occ', 'psychic'),
        ]),
        selectedRaceId: 'race_human',
      },
      raceMap,
    )
    expect(agentTier.tier).toBe(3)
    expect(agentTier.tagMismatchReason).toMatch(/Does not match filter.*psychic/i)
  })

  it('Not psychic greys psychic O.C.C.s and keeps non-psychic at Tier 1', () => {
    const psychicTier = assessOccConfiguratorTier(
      psychicOcc,
      {
        configuratorFilter: newFilterNotNode(
          newFilterPredicateNode('occ', 'psychic'),
        ),
        selectedRaceId: 'race_human',
      },
      raceMap,
    )
    expect(psychicTier.tier).toBe(3)
    expect(psychicTier.tagMismatchReason).toMatch(/Does not match filter/i)

    const agentTier = assessOccConfiguratorTier(
      agentOcc,
      {
        configuratorFilter: newFilterNotNode(
          newFilterPredicateNode('occ', 'psychic'),
        ),
        selectedRaceId: 'race_human',
      },
      raceMap,
    )
    expect(agentTier.tier).toBe(1)
  })

  it('Tier 2 beats tag mismatch when both apply', () => {
    const tier = assessOccConfiguratorTier(
      nightbaneOnlyOcc,
      {
        configuratorFilter: newFilterGroupNode('and', [
          newFilterPredicateNode('occ', 'magic'),
        ]),
        selectedRaceId: 'race_human',
      },
      raceMap,
    )
    expect(tier.tier).toBe(2)
  })

  it('filters alignment when O.C.C. restricts codes', () => {
    const tier = assessAlignmentConfiguratorTier(
      'Principled',
      { configuratorFilter: null, selectedOccId: 'occ_diabolic_only' },
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
        configuratorFilter: null,
        selectedOccId: 'occ_diabolic_only',
      },
      occMap,
    )
    expect(tier.tier).toBe(1)
  })

  it('does not tier-lock race rows for incompatible chosen alignment', () => {
    const tier = assessRaceConfiguratorTier(
      human,
      {
        configuratorFilter: null,
        selectedAlignment: 'Diabolic',
        selectedOccId: 'occ_agent',
      },
      occMap,
    )
    expect(tier.tier).toBe(1)
  })

  it('formats O.C.C. alignment notes with grouped evil + anarchist', () => {
    const assassinOcc = {
      ...agentOcc,
      id: 'occ_assassin',
      name: 'Assassin',
      alignmentRestrictions: {
        allowed: ['Anarchist', 'Miscreant', 'Aberrant', 'Diabolic'],
      },
    } as PalladiumOcc
    expect(formatOccAlignmentRestrictionNote(assassinOcc)).toBe(
      'Only available to Anarchist or Evil alignments',
    )
  })

  it('greys out incompatible alignment options for selected O.C.C.', () => {
    expect(
      describeAlignmentSelectionConflict('Principled', human, diabolicOcc),
    ).toMatch(/requires/i)
    const openRace = {
      ...human,
      id: 'race_open',
      demographics: {},
    } as Race
    expect(
      describeAlignmentSelectionConflict('Diabolic', openRace, diabolicOcc),
    ).toBeNull()
    expect(
      describeAlignmentSelectionConflict('Diabolic', human, diabolicOcc),
    ).toMatch(/prohibits/i)
  })

  it('formats race excluded alignment notes', () => {
    expect(formatRaceAlignmentRestrictionNote(human)).toBe(
      'Not available to Diabolic',
    )
    expect(
      summarizeAlignmentNames(['Principled', 'Scrupulous']),
    ).toBe('Good alignments')
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
          { configuratorFilter: null, selectedRaceId: 'race_human' },
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
          { configuratorFilter: null, selectedRaceId: 'race_human' },
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
          {
        configuratorFilter: newFilterGroupNode('and', [
          newFilterPredicateNode('occ', 'magic'),
        ]),
        selectedRaceId: 'race_human',
      },
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

  it('filters race pool to occ-compatible entries when hiding incompatible', () => {
    const nightbaneRace = { ...human, id: 'race_nightbane', name: 'Nightbane' } as Race
    const races = [human, nightbaneRace]
    expect(
      filterConfiguratorRacePoolForOcc(races, nightbaneOnlyOcc, true).map((r) => r.id),
    ).toEqual(['race_nightbane'])
    expect(
      filterConfiguratorRacePoolForOcc(races, nightbaneOnlyOcc, false).map((r) => r.id),
    ).toEqual(['race_human', 'race_nightbane'])
  })

  it('filters occ pool to race-compatible entries when hiding incompatible', () => {
    const pool = [agentOcc, nightbaneOnlyOcc, psychicOcc]
    expect(
      filterConfiguratorOccPoolForRace(pool, human, true).map((o) => o.id),
    ).toEqual(['occ_agent', 'occ_psychic'])
    expect(
      filterConfiguratorOccPoolForRace(pool, human, false).map((o) => o.id),
    ).toEqual(['occ_agent', 'occ_nightbane_only', 'occ_psychic'])
    expect(isOccCompatibleWithRace(human, nightbaneOnlyOcc)).toBe(false)
    expect(isOccCompatibleWithRace(human, agentOcc)).toBe(true)
  })

  it('drops tier 3 rows from scroll lists when hiding filter mismatches', () => {
    const tierOf = (id: string) =>
      id === 'occ_match'
        ? { tier: 1 as const }
        : { tier: 3 as const, tagMismatchReason: 'filter' }
    const items = [{ id: 'occ_match' }, { id: 'occ_miss' }]
    expect(
      filterConfiguratorListForActiveFilter(items, (i) => tierOf(i.id), false).map(
        (i) => i.id,
      ),
    ).toEqual(['occ_match', 'occ_miss'])
    expect(
      filterConfiguratorListForActiveFilter(items, (i) => tierOf(i.id), true).map(
        (i) => i.id,
      ),
    ).toEqual(['occ_match'])
  })

  it('formats attribute requirements on occ rows', () => {
    const withReqs = {
      ...agentOcc,
      attributeRequirements: { iq: 12, pe: 14 },
    } as PalladiumOcc
    expect(formatOccAttributeRequirements(withReqs)).toMatch(/I\.Q\. 12\+/)
    expect(formatOccAttributeRequirements(withReqs)).toMatch(/P\.E\. 14\+/)
  })

  it('race alignment conflict description when demographics exclude alignment', () => {
    expect(describeRaceAlignmentConflict(human, 'Diabolic')).toMatch(/prohibits/i)
  })
})
