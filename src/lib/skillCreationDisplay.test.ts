import { describe, expect, it } from 'vitest'

import { getSkillById } from '../data/skillLibrary'
import { getLibraryOccById } from '../data/library/registry'
import { buildCreationSkillPick } from './creationSkillPicks'
import { resolveSkillCreationDisplay } from './skillCreationDisplay'
import { buildLiveSkillContext } from './liveSkillEngine'
import { createBlankCharacterForGenre } from './characterRoot'

describe('skillCreationDisplay voucher bonuses', () => {
  it('applies voucher bonusPercent to locked voucher picks', () => {
    const occ = getLibraryOccById('occ_pandora_project_researcher')
    const def = getSkillById('skill_biology')
    expect(occ).toBeDefined()
    expect(def).toBeDefined()
    if (!occ || !def) return

    const character = createBlankCharacterForGenre('nightbane')
    const skillPercentCtx = buildLiveSkillContext(character, 'primary')

    const display = resolveSkillCreationDisplay(def, 'occ', {
      occ,
      relatedIds: new Set(),
      allSelectedIds: new Set(['skill_biology']),
      psychicTier: 'none',
      specializationId: null,
      voucherPicks: {
        core_voucher_4: [buildCreationSkillPick('skill_biology', {})],
      },
      skillPercentCtx,
      iqBonus: 0,
      maPbBonus: 0,
      pick: buildCreationSkillPick('skill_biology', {}),
    })

    const occCoreBonus = display.equationBonuses.find(
      (line) => line.label === 'O.C.C. core',
    )
    expect(occCoreBonus?.value).toBe(20)
    expect(display.total).toBeGreaterThan(def.basePercent)
  })
})

describe('skillCreationDisplay percent summary', () => {
  it('orders tooltip parts and resolves catalog synergies by source skill', () => {
    const occ = getLibraryOccById('occ_pandora_project_researcher')
    const def = getSkillById('skill_locksmith')
    expect(occ).toBeDefined()
    expect(def).toBeDefined()
    if (!occ || !def) return

    const character = createBlankCharacterForGenre('nightbane')
    const skillPercentCtx = buildLiveSkillContext(character, 'primary')
    // Override I.Q. for predictable tooltip parts in this fixture.
    skillPercentCtx.iqBonus = 4
    const pick = buildCreationSkillPick('skill_locksmith', {})
    const synergyPick = buildCreationSkillPick('skill_electrical_engineer', {})

    const display = resolveSkillCreationDisplay(def, 'secondary', {
      allSelectedIds: new Set(['skill_locksmith', 'skill_electrical_engineer']),
      psychicTier: 'none',
      specializationId: null,
      voucherPicks: {},
      skillPercentCtx,
      iqBonus: 4,
      maPbBonus: 0,
      pick,
      allPicks: [pick, synergyPick],
    })

    expect(display.percentSummary?.total).toBeGreaterThan(25)
    expect(display.percentSummary?.parts.map((part) => part.kind)).toEqual([
      'base',
      'iq',
      'synergy',
    ])
    expect(display.percentSummary?.parts[2]?.text).toContain('Electrical Engineer')
    expect(display.percentSummary?.parts[2]?.text).toContain('+5%')
  })
})
