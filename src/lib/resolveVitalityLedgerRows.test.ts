import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import { createBlankCharacterForGenre } from './characterRoot'
import { resolveVitalityLedgerRows } from './resolveVitalityLedgerRows'
import { resolveIspCreationFormula } from './ledgerVitalFormula'
import { projectPendingDiceBlockFromRow } from './resolveCreationLedgerContext'

describe('resolveVitalityLedgerRows', () => {
  it('builds facade S.D.C. row with flat baseline and dice contributions', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...characterFixture,
      creationAttributeAssignments: { pe: 12, ps: 10 },
    }
    const showIsp = true
    const { facade } = resolveVitalityLedgerRows({
      character,
      race: human,
      occ,
      skillIds: [],
      assignments: character.creationAttributeAssignments ?? {},
      pendingAttrBonuses: {},
      occVariableResolutions: {},
      resolutions: {},
      showIsp,
      ispFormula: resolveIspCreationFormula(occ, 'major', showIsp),
    })
    expect(facade.sdc?.section).toBe('vitality')
    expect(facade.sdc?.formScope).toBe('facade')
    expect(
      (facade.sdc?.pendingFlatBaseline ?? 0) > 0 ||
        (facade.sdc?.contributions.length ?? 0) > 0,
    ).toBe(true)
    const projected = projectPendingDiceBlockFromRow(facade.sdc!)
    expect(projected?.id).toBe('sdc')
    expect(projected?.flatBaseline).toBe(facade.sdc?.pendingFlatBaseline)
  })

  it('builds morphus vitals when dual-form is enabled', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const character = createBlankCharacterForGenre('nightbane')
    const showIsp = false
    const { morphus } = resolveVitalityLedgerRows({
      character,
      race,
      occ,
      skillIds: [],
      assignments: {},
      pendingAttrBonuses: {},
      occVariableResolutions: {},
      resolutions: {},
      showIsp,
      supportsDualForm: true,
      ispFormula: resolveIspCreationFormula(occ, 'none', showIsp),
    })
    expect(morphus.morphus_hp?.formScope).toBe('morphus')
    expect(morphus.morphus_sdc?.formScope).toBe('morphus')
    expect(morphus.morphus_hf?.formScope).toBe('morphus')
  })
})
