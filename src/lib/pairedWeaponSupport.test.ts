import { describe, expect, it } from 'vitest'
import {
  hasPairedWeaponSupportWp,
  pairedWeaponsSupportBlockReason,
  WP_PAIRED_WEAPONS_SKILL_ID,
} from './pairedWeaponSupport'
import {
  creationLibrarySkillAddState,
  resolveCreationLibrarySkillBlockReason,
} from './creationSkillPicks'
import { getEngineSkillDefFromCatalog } from './creationSkillCatalog'

describe('pairedWeaponSupport', () => {
  it('recognizes ancient one-handed melee W.P. support', () => {
    expect(hasPairedWeaponSupportWp(['wp_sword'])).toBe(true)
    expect(hasPairedWeaponSupportWp(['wp_knife'])).toBe(true)
    expect(hasPairedWeaponSupportWp(['wp_polearm'])).toBe(false)
    expect(hasPairedWeaponSupportWp([])).toBe(false)
  })

  it('blocks W.P. Paired Weapons without a supporting W.P.', () => {
    const def = getEngineSkillDefFromCatalog(WP_PAIRED_WEAPONS_SKILL_ID)
    expect(def).toBeDefined()
    const ctx = {
      effectiveOcc: null,
      specializationId: null,
      relatedSlotsUsed: 0,
      relatedSkillCap: 4,
      secondaryPickSlots: 0,
      secondaryCap: 4,
      occPicks: [],
      relatedPicks: [],
      secondaryPicks: [],
    }
    const blocked = creationLibrarySkillAddState(def!, ctx)
    expect(blocked.canAddRelated).toBe(false)
    expect(blocked.canAddSecondary).toBe(false)
    expect(resolveCreationLibrarySkillBlockReason(def!, ctx)).toBe(
      pairedWeaponsSupportBlockReason([]),
    )
  })

  it('allows W.P. Paired Weapons when a sword W.P. is selected', () => {
    const def = getEngineSkillDefFromCatalog(WP_PAIRED_WEAPONS_SKILL_ID)
    const ctx = {
      effectiveOcc: null,
      specializationId: null,
      relatedSlotsUsed: 1,
      relatedSkillCap: 4,
      secondaryPickSlots: 0,
      secondaryCap: 4,
      occPicks: [],
      relatedPicks: [{ instanceId: 'a', skillId: 'wp_sword' }],
      secondaryPicks: [],
    }
    const state = creationLibrarySkillAddState(def!, ctx)
    expect(state.canAddRelated).toBe(true)
    expect(resolveCreationLibrarySkillBlockReason(def!, ctx)).toBe('')
  })
})
