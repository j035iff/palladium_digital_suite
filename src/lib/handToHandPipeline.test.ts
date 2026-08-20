import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { getLibraryOccById } from '../data/library/registry'
import type { PalladiumOcc } from '../types'
import {
  listOwnedHandToHandStyles,
  resolveActiveHandToHandSkillId,
  resolveHandToHandCombatProfile,
} from './handToHandPipeline'

const grantedBasicOcc = {
  handToHandRules: {
    defaultSkillId: 'hth_basic',
    upgradePaths: [
      { targetSkillId: 'hth_expert', electiveSlotCost: 2 },
      { targetSkillId: 'hth_martial_arts', electiveSlotCost: 3 },
    ],
  },
} as unknown as PalladiumOcc

const exGovernmentOcc = getLibraryOccById('occ_ex_government_agent')

describe('listOwnedHandToHandStyles', () => {
  it('lists Hand-to-Hand: None when no trained style is owned', () => {
    const styles = listOwnedHandToHandStyles(
      { ...characterFixture, creationHandToHandTier: undefined },
      'primary',
      undefined,
    )
    expect(styles.map((s) => s.catalogId)).toEqual(['hth_none'])
  })

  it('includes a creation-tier style and omits None', () => {
    const styles = listOwnedHandToHandStyles(
      { ...characterFixture, creationHandToHandTier: 'expert' },
      'primary',
      undefined,
    )
    expect(styles.map((s) => s.catalogId)).toEqual(['hth_expert'])
  })

  it('includes O.C.C. granted basic when stored tier is none', () => {
    const styles = listOwnedHandToHandStyles(
      { ...characterFixture, creationHandToHandTier: 'none' },
      'primary',
      exGovernmentOcc,
    )
    expect(styles.map((s) => s.catalogId)).toEqual(['hth_basic'])
  })

  it('lists every unlocked style (rare multi-HtH) plus a granted O.C.C. default', () => {
    const styles = listOwnedHandToHandStyles(
      {
        ...characterFixture,
        creationHandToHandTier: undefined,
        creationOccSkillIds: [
          ...(characterFixture.creationOccSkillIds ?? []),
          'skill_hand_to_hand_expert',
          'skill_hand_to_hand_martial_arts',
        ],
      },
      'primary',
      grantedBasicOcc,
    )
    expect(styles.map((s) => s.catalogId)).toEqual([
      'hth_basic',
      'hth_expert',
      'hth_martial_arts',
    ])
  })
})

describe('resolveActiveHandToHandSkillId', () => {
  it('uses effective O.C.C. basic when stored tier is none', () => {
    expect(
      resolveActiveHandToHandSkillId(
        { ...characterFixture, creationHandToHandTier: 'none' },
        'primary',
        exGovernmentOcc,
      ),
    ).toBe('hth_basic')
  })

  it('uses sheet Hand-to-Hand ids for finalized characters', () => {
    expect(
      resolveActiveHandToHandSkillId(
        {
          ...characterFixture,
          isFinalized: true,
          creationHandToHandTier: 'none',
          primary: {
            ...characterFixture.primary,
            skills: [
              ...characterFixture.primary.skills,
              {
                id: 'skill_hand_to_hand_expert',
                name: 'Hand-to-Hand: Expert',
                restricted: false,
                basePercent: 0,
              },
            ],
          },
        },
        'primary',
        exGovernmentOcc,
      ),
    ).toBe('hth_expert')
  })

  it('keeps creation tier after finalize when still stored', () => {
    expect(
      resolveActiveHandToHandSkillId(
        {
          ...characterFixture,
          isFinalized: true,
          creationHandToHandTier: 'martial_arts',
        },
        'primary',
        exGovernmentOcc,
      ),
    ).toBe('hth_martial_arts')
  })
})

describe('resolveHandToHandCombatProfile', () => {
  it('uses activeCombatHandToHandSkillId when that style is owned', () => {
    const character = {
      ...characterFixture,
      creationHandToHandTier: undefined,
      creationOccSkillIds: [
        ...(characterFixture.creationOccSkillIds ?? []),
        'skill_hand_to_hand_expert',
        'skill_hand_to_hand_martial_arts',
      ],
      activeCombatHandToHandSkillId: 'hth_expert',
    }
    const profile = resolveHandToHandCombatProfile(character, 'primary', undefined)
    expect(profile.skillId).toBe('hth_expert')
  })

  it('ignores an override that is not owned and falls back to the highest style', () => {
    const character = {
      ...characterFixture,
      creationHandToHandTier: undefined,
      creationOccSkillIds: [
        ...(characterFixture.creationOccSkillIds ?? []),
        'skill_hand_to_hand_expert',
        'skill_hand_to_hand_martial_arts',
      ],
      activeCombatHandToHandSkillId: 'hth_assassin',
    }
    const profile = resolveHandToHandCombatProfile(character, 'primary', undefined)
    expect(profile.skillId).toBe('hth_martial_arts')
  })

  it('labels the Unarmed bubble from the resolved style name', () => {
    const profile = resolveHandToHandCombatProfile(
      { ...characterFixture, creationHandToHandTier: 'expert' },
      'primary',
      exGovernmentOcc,
    )
    expect(profile.skillName).toBe('Hand-to-Hand: Expert')
  })
})

describe('Nightbane Morphus innate Hand-to-Hand', () => {
  const nightbane = {
    ...characterFixture,
    raceId: 'race_nightbane',
    creationHandToHandTier: 'basic' as const,
    activeCombatHandToHandSkillId: 'hth_basic',
    primary: {
      ...characterFixture.primary,
      skills: [
        ...characterFixture.primary.skills,
        {
          id: 'skill_hand_to_hand_basic',
          name: 'Hand-to-Hand: Basic',
          restricted: false,
          basePercent: 0,
        },
      ],
    },
  }

  it('uses Martial Arts on Morphus regardless of Facade tier', () => {
    expect(
      resolveActiveHandToHandSkillId(nightbane, 'morphus', exGovernmentOcc),
    ).toBe('hth_martial_arts')
    const profile = resolveHandToHandCombatProfile(nightbane, 'morphus', exGovernmentOcc)
    expect(profile.skillId).toBe('hth_martial_arts')
    expect(profile.skillName).toBe('Hand-to-Hand: Martial Arts')
  })

  it('lists only the innate Morphus style — not Facade picks', () => {
    const styles = listOwnedHandToHandStyles(nightbane, 'morphus', exGovernmentOcc)
    expect(styles.map((s) => s.catalogId)).toEqual(['hth_martial_arts'])
  })

  it('ignores Facade combat override when on Morphus', () => {
    const profile = resolveHandToHandCombatProfile(
      { ...nightbane, activeCombatHandToHandSkillId: 'hth_expert' },
      'morphus',
      exGovernmentOcc,
    )
    expect(profile.skillId).toBe('hth_martial_arts')
  })

  it('still uses Facade Hand-to-Hand on primary form', () => {
    expect(
      resolveActiveHandToHandSkillId(nightbane, 'primary', exGovernmentOcc),
    ).toBe('hth_basic')
  })
})
