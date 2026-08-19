import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import type { PalladiumOcc } from '../types'
import {
  listOwnedHandToHandStyles,
  resolveHandToHandCombatProfile,
} from './handToHandPipeline'

const grantedBasicOcc = {
  handToHandRules: {
    defaultSkillId: 'hth_basic',
    upgradePaths: [],
  },
} as unknown as PalladiumOcc

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
})
