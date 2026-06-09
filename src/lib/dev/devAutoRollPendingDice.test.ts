import { describe, expect, it, vi } from 'vitest'
import { characterFixture } from '../../data/characterFixture'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import { rollDiceNotation } from '../diceNotation'
import {
  buildAutoRolledPendingDiceResolutions,
  rollPendingDiceValue,
} from './devAutoRollPendingDice'

describe('devAutoRollPendingDice', () => {
  it('clamps rolled values to pending dice min/max', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const roll = {
      id: 'spawn.test.race.0',
      notation: '3D6',
      min: 3,
      max: 18,
      source: 'Race',
    }
    expect(rollPendingDiceValue(roll)).toBe(3)
    vi.restoreAllMocks()
  })

  it('rolls display notation with x multiplier (1D4x10)', () => {
    expect(rollDiceNotation('1D4x10')).toBeGreaterThanOrEqual(10)
    expect(rollDiceNotation('1D4x10')).toBeLessThanOrEqual(40)
  })

  it('auto-rolls all P.A.B. Psychic Agent pending fields without error', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...characterFixture,
      creationAttributeAssignments: { pe: 12, spd: 11 },
      creationSecondarySkillPicks: [
        { instanceId: 'a', skillId: 'skill_athletics_general' },
        { instanceId: 'b', skillId: 'skill_running' },
        { instanceId: 'c', skillId: 'skill_wrestling' },
      ],
    }
    const resolutions = buildAutoRolledPendingDiceResolutions(
      character,
      human,
      occ,
      { psychicTier: 'major' },
    )
    expect(Object.keys(resolutions).length).toBeGreaterThan(0)
    for (const value of Object.values(resolutions)) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })
})
