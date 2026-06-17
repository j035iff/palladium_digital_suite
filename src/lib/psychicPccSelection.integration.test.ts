import { describe, expect, it } from 'vitest'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import { createBlankCharacterForGenre } from './characterRoot'
import { applyOccSelectionToCharacterState } from './shadowOcc'
import { buildConfiguratorPackageSummary } from './configuratorPackageSummary'
import { resolveEffectiveCreationAbilityBudget } from './creationAbilityBudget'
import { resolveCreationPsychicTier } from './creationPsychicSkills'
import {
  buildCharacterCreationForgeContext,
  deriveCharacterCreationForgeNavigation,
} from './forgeNavigation/characterCreationForge'
import { listCharacterCreationTabRequirements } from './forgeNavigation/characterCreationTabRequirements'
import {
  listOccEnginePerCategoryBuckets,
  occEngineHasPerCategoryPsionicPlan,
} from './occSupernaturalSelection'
import { occSupernaturalGrantedAbilityIds } from './occSupernaturalGrants'

describe('Psychic P.C.C. selection integration', () => {
  it('mounts OCC state and derives forge navigation without throwing', () => {
    const race = getRaceById('race_human')
    const occ = getLibraryOccById('occ_psychic_pcc')
    expect(race).toBeDefined()
    expect(occ).toBeDefined()

    let root = createBlankCharacterForGenre('nightbane')
    root = { ...root, raceId: 'race_human' }
    root = applyOccSelectionToCharacterState(root, 'occ_psychic_pcc', {
      activeForm: 'primary',
    })

    expect(root.occ.id).toBe('occ_psychic_pcc')
    expect(root.creationPsychicTier).toBe('master')

    buildConfiguratorPackageSummary(race, occ, null)

    const tier = resolveCreationPsychicTier(root, root.creationPsychicTier ?? 'none')
    resolveEffectiveCreationAbilityBudget({
      occ,
      psychicTier: tier,
      psychicGateBypassed: root.psychicGateBypassed === true,
      majorAllocation: root.creationPsychicGateMajorAllocation,
      storedBudget: root.creationAbilityBudget,
      creationGenreId: root.creationGenreId,
    })

    const grantedIds = occSupernaturalGrantedAbilityIds(occ, root.occSpecializationId)
    expect(grantedIds.length).toBe(4)
    expect(occEngineHasPerCategoryPsionicPlan(occ)).toBe(true)
    listOccEnginePerCategoryBuckets(
      occ,
      root.selectedAbilities,
      root.creationGenreId ?? 'nightbane',
      grantedIds,
    )

    const ctx = buildCharacterCreationForgeContext(root, race, occ, tier)
    deriveCharacterCreationForgeNavigation(ctx, 'tab1_configurator')
    listCharacterCreationTabRequirements('tab7_abilities', ctx)
  })
})
