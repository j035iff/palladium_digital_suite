import { describe, expect, it } from 'vitest'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import { createBlankCharacterForGenre, retainCharacterRoot } from '../characterRoot'
import { creationInvalidationPatch } from '../creationInvalidate'
import { resolvePsychicGateBypassed } from '../creationPhases'
import { syncRaceOccPrimarySdc } from '../creationRaceOccSync'
import { creationFreeRelatedSkillCap } from '../creationSkillPicks'
import { buildCharacterCreationForgeContext } from '../forgeNavigation/characterCreationForge'
import { listCharacterCreationTabRequirements } from '../forgeNavigation/characterCreationTabRequirements'
import {
  applyOccStartingSkillPicks,
  deriveOccCreation,
  patchCharacterCreationFromOcc,
} from '../occCreationDerivation'
import {
  listOccRelatedVoucherTasks,
  listVocationalFocusVoucherTasks,
  sumRelatedVoucherReservedSlots,
} from '../occRelatedSkillVouchers'
import { raceLineageFromDefinition } from '../raceEngine'
import { applyOccSelectionToCharacterState } from '../shadowOcc'
import { buildDevAutoFillCreationSkillsState } from './devAutoFillCreationSkills'

function withHumanGeneralCitizen(specId: string) {
  const genreId = 'nightbane' as const
  const race = getRaceById('race_human', genreId)!
  const occ = getLibraryOccById('occ_general_citizen')!
  let next = createBlankCharacterForGenre(genreId)
  next = syncRaceOccPrimarySdc({
    ...next,
    ...creationInvalidationPatch(next, 'race'),
    raceId: 'race_human',
    lineage: raceLineageFromDefinition(race),
    psychicGateBypassed: resolvePsychicGateBypassed(
      'race_human',
      undefined,
      genreId,
    ),
  })
  next = applyOccSelectionToCharacterState(next, 'occ_general_citizen', {
    activeForm: 'primary',
    invalidateScope: 'race',
  })
  const withSpec = {
    ...next,
    ...creationInvalidationPatch(next, 'specialization'),
    occSpecializationId: specId,
  }
  next = syncRaceOccPrimarySdc(
    retainCharacterRoot(
      next,
      applyOccStartingSkillPicks(
        patchCharacterCreationFromOcc(withSpec, occ),
        occ,
      ),
    ),
  )
  return { next, race, occ }
}

describe('General Citizen skills creation', () => {
  it('reserves all related vouchers for free-related cap (not vocational-only)', () => {
    const occ = getLibraryOccById('occ_general_citizen')!
    const derived = deriveOccCreation(occ, 'street_schooled')
    const tasks = listOccRelatedVoucherTasks(occ, 'street_schooled')
    const vocational = listVocationalFocusVoucherTasks(tasks)

    expect(sumRelatedVoucherReservedSlots(vocational)).toBe(0)
    expect(sumRelatedVoucherReservedSlots(tasks)).toBe(3)
    expect(
      creationFreeRelatedSkillCap(
        derived.occRelatedSkillSlotBudget,
        sumRelatedVoucherReservedSlots(tasks),
      ),
    ).toBe(3)
  })

  it('requires specialization secondary slots on the skills tab', () => {
    const { next, race, occ } = withHumanGeneralCitizen('street_schooled')
    const ctx = buildCharacterCreationForgeContext(next, race, occ, 'none')
    const reqs = listCharacterCreationTabRequirements('tab4_skills', ctx)
    const secondary = reqs.find((r) => r.id === 'secondary-slots')
    expect(secondary?.satisfied).toBe(false)
    expect(secondary?.label).toMatch(/secondary/i)
  })

  for (const specId of [
    'street_schooled',
    'street_thug',
    'high_school_educated',
    'associates_vocational',
    'laborer_light',
  ] as const) {
    it(`autofill clears skills-tab blockers for ${specId}`, () => {
      const { next: base, race, occ } = withHumanGeneralCitizen(specId)
      const next = buildDevAutoFillCreationSkillsState(
        base,
        occ,
        'nightbane',
        'none',
      )
      const ctx = buildCharacterCreationForgeContext(next, race, occ, 'none')
      const unsatisfied = listCharacterCreationTabRequirements(
        'tab4_skills',
        ctx,
      ).filter((r) => !r.satisfied)
      expect(unsatisfied, JSON.stringify(unsatisfied, null, 2)).toEqual([])
    })
  }
})
