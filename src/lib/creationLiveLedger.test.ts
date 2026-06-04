import { describe, expect, it } from 'vitest'
import {
  buildCreationCombatLedger,
  buildCreationCombatBlock,
  buildCreationPhysicalStaging,
  buildCreationSavesBlock,
  LEDGER_NA,
} from './creationLiveLedger'
import { characterFixture } from '../data/characterFixture'
import { createEmptyAccumulatedHandToHandBonuses } from '../utils/combatCalculator'

describe('creationLiveLedger', () => {
  it('aggregates boxing combat and staging bonuses', () => {
    const attrs = characterFixture.facade.attributes
    const combat = buildCreationCombatLedger(attrs, ['skill_boxing'], 1)
    expect(combat.parry).toBeGreaterThanOrEqual(2)
    expect(combat.dodge).toBeGreaterThanOrEqual(2)
    expect(combat.attacksPerMelee).toBeGreaterThanOrEqual(3)

    const physical = buildCreationPhysicalStaging(['skill_boxing'])
    expect(physical.lines.some((l) => l.label === 'PS')).toBe(true)
    expect(physical.pendingDiceLines.some((l) => l.value === '3D6')).toBe(true)
  })

  it('merges roll w/ punch into roll w/ punch, fall, impact', () => {
    const attrs = characterFixture.facade.attributes
    const hth = createEmptyAccumulatedHandToHandBonuses()
    hth.pullPunch = 2
    hth.rollWithPunch = 3
    const combat = buildCreationCombatLedger(attrs, [], 1, hth)
    expect(combat.pullPunch).toBe(2)
    expect(combat.rollWithPunchFallImpact).toBeGreaterThan(combat.dodge)

    const block = buildCreationCombatBlock(combat)
    const rollLine = block.find((l) => l.label === 'Roll w/ punch, fall, impact')
    expect(rollLine).toBeDefined()
    expect(block.find((l) => l.label === 'Roll w/ punch')).toBeUndefined()
  })

  it('shows N/A for inactive save bonuses', () => {
    const attrs = { ...characterFixture.facade.attributes, pe: 10, me: 10, iq: 10 }
    const saves = buildCreationSavesBlock(attrs, {})
    expect(saves.find((s) => s.label === 'Magic')?.value).toBe(LEDGER_NA)
    expect(saves.find((s) => s.label === 'Mind Control')?.value).toBe(LEDGER_NA)
  })
})
