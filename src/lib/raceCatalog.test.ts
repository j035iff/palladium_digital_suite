import { describe, expect, it } from 'vitest'
import {
  getPalladiumRaceById,
  PALLADIUM_RACE_CATALOG,
} from '../data/library/raceCatalogLoader'
import {
  listRacesForCharacterCreation,
  listNpcRaces,
  listGmApprovalRaces,
  listCreatureRaces,
  raceAllowedInCharacterCreation,
  isGmApprovalRacePool,
} from './raceCatalog'

describe('race catalog pools', () => {
  it('loads human from nightbane player pool', () => {
    const human = getPalladiumRaceById('race_human', 'nightbane')
    expect(human?.raceAudience).toBe('player')
    expect(human?.catalogGenreId).toBe('nightbane')
  })

  it('resolves genre-scoped human rows with same id', () => {
    const nightbane = getPalladiumRaceById('race_human', 'nightbane')
    const rifts = getPalladiumRaceById('race_human', 'rifts')
    expect(nightbane?.gameSystems).toEqual(['nightbane'])
    expect(rifts?.gameSystems).toEqual(['rifts'])
    expect(nightbane?.psionics.capabilityType).toBe('none')
    expect(rifts?.psionics.capabilityType).toBe('standard')
  })

  it('lists only player races for creation in host genre', () => {
    const pool = listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(pool.some((r) => r.id === 'race_human')).toBe(true)
    expect(pool.some((r) => r.id === 'race_nightbane')).toBe(true)
    expect(pool.every((r) => r.raceAudience === 'player')).toBe(true)
    expect(pool.length).toBe(7)
  })

  it('loads nightbane as playable dual-form race with pass B metadata', () => {
    const nightbane = getPalladiumRaceById('race_nightbane', 'nightbane')
    expect(nightbane?.raceAudience).toBe('player')
    expect(nightbane?.creationSubForgeId).toBe('morphus_forge_manifest')
    expect(nightbane?.canPickOcc).toBe(true)
    expect(nightbane?.vitals.sdc).toBe(30)
    expect(nightbane?.innateBonuses.metadata?.dualFormRcc).toBe(true)
    expect(nightbane?.innateBonuses.metadata?.morphusPsBonus).toBe(10)
    expect(nightbane?.innateBonuses.metadata?.mirrorWalkPpe).toBe(2)
    expect(nightbane?.innateBonuses.metadata?.regenerationPerMelee).toBe(10)
    expect(nightbane?.innateBonuses.metadata?.freeTalentLevels).toEqual([1, 4, 7, 10, 12])
    expect(
      (nightbane?.innateBonuses.metadata?.morphusBonuses as { save_magic?: number } | undefined)
        ?.save_magic,
    ).toBe(4)
    expect(nightbane?.innateBonuses.activation?.cost?.type).toBe('ppe')
    expect(nightbane?.occLimitations.allowedOccIds).toContain('occ_nightbane_basic')
    expect(nightbane?.demographics.averageLifespan).toContain('1,000')
  })

  it('loads guardian as playable race with pass B metadata', () => {
    const guardian = getPalladiumRaceById('race_guardian', 'nightbane')
    expect(guardian?.raceAudience).toBe('player')
    expect(guardian?.raceComposition).toBe('rcc')
    expect(guardian?.forcedOccId).toBe('occ_guardian_rcc')
    expect(guardian?.vitals.sdc).toBe('2D6*10+100')
    expect(guardian?.vitals.hpFormula).toBe('PE*2 + 2D6')
    expect(guardian?.innateBonuses.metadata?.shadowOccId).toBe('occ_guardian_rcc')
    expect(guardian?.innateBonuses.metadata?.healingTouchPpePerPoint).toBe(1)
    expect(guardian?.innateBonuses.metadata?.flyPpe).toBe(6)
    expect(guardian?.innateBonuses.metadata?.nightlandsCountsAsLightDeprivation).toBe(true)
    expect(guardian?.innateBonuses.metadata?.psionicGrantIdsCore).toContain('psionic_see_aura')
    expect(guardian?.innateBonuses.activation?.cost?.type).toBe('ppe')
    expect(guardian?.innateBonuses.metadata?.enemySupernaturalRaceIds).toContain(
      'race_master_vampire',
    )
    expect(guardian?.demographics.excludedAlignments).toContain('Diabolic')
    expect(guardian?.demographics.averageLifespan).toBe('300 to 400 years')
  })

  it('loads wampyr as playable race with pass B metadata', () => {
    const wampyr = getPalladiumRaceById('race_wampyr', 'nightbane')
    const secondary = getPalladiumRaceById('race_secondary_vampire', 'nightbane')
    expect(wampyr?.raceAudience).toBe('player')
    expect(wampyr?.raceComposition).toBe('rcc')
    expect(wampyr?.forcedOccId).toBe('occ_wampyr_rcc')
    expect(wampyr?.vitals.sdc).toBe('2D6*10+20')
    expect(wampyr?.vitals.hpFormula).toBe('PE*2 + 1D6')
    expect(wampyr?.innateBonuses.metadata?.excludedFromTrueVampirePowersModule).toBe(true)
    expect(wampyr?.innateBonuses.metadata?.immuneVampireMindControl).toBe(true)
    expect(wampyr?.innateBonuses.metadata?.bloodPintsPer72Hours).toBe(1)
    expect(wampyr?.innateBonuses.metadata?.sunlightDamagePerMinute).toBe('2D6')
    expect(wampyr?.innateBonuses.activation?.cost?.type).toBe('other')
    expect(wampyr?.innateBonuses.metadata?.huntedByTrueVampireRaceIds).toContain(
      'race_master_vampire',
    )
    expect(wampyr?.demographics.excludedAlignments).toContain('Principled')
    const wampyrSlowKill = secondary?.innateBonuses.metadata?.slowKillOutcomeRoll as
      | Record<string, string>
      | undefined
    expect(wampyrSlowKill?.['01-02']).toBe('race_wampyr')
    expect(wampyr?.classAbilities?.some((a) => a.name === 'A Lust for Blood')).toBe(false)
  })

  it('loads wild vampire as playable race with pass B metadata', () => {
    const wild = getPalladiumRaceById('race_wild_vampire', 'nightbane')
    const secondary = getPalladiumRaceById('race_secondary_vampire', 'nightbane')
    expect(wild?.raceAudience).toBe('player')
    expect(wild?.raceComposition).toBe('rcc')
    expect(wild?.forcedOccId).toBe('occ_wild_vampire_rcc')
    expect(wild?.vitals.hpFormula).toBe('2D4*10')
    expect(wild?.psionics.naturalIspFormula).toBe('1D6*10')
    expect(wild?.vitals.averageStandardPpe).toBe('6D6')
    expect(wild?.innateBonuses.metadata?.vampireTier).toBe('wild')
    expect(wild?.innateBonuses.metadata?.attacksPerMelee).toBe(5)
    expect(wild?.innateBonuses.metadata?.minorPsionicSaveTarget).toBe(12)
    expect(wild?.innateBonuses.metadata?.slowKillCreatesTier).toBe('wild')
    expect(wild?.innateBonuses.metadata?.hierarchySecondaryCreatorRaceId).toBe(
      'race_secondary_vampire',
    )
    expect(wild?.innateBonuses.metadata?.huntedByNightlordMinions).toBe(true)
    expect(wild?.innateBonuses.metadata?.pcMaxAlignment).toBe('Anarchist')
    expect(wild?.innateBonuses.activation?.cost?.type).toBe('other')
    expect(secondary?.innateBonuses.metadata?.hierarchySubordinateRaceIds).toContain(
      'race_wild_vampire',
    )
    expect(wild?.classAbilities?.some((a) => a.name === 'A Lust for Blood')).toBe(true)
  })

  it('loads secondary vampire as playable race with pass B metadata', () => {
    const secondary = getPalladiumRaceById('race_secondary_vampire', 'nightbane')
    const master = getPalladiumRaceById('race_master_vampire', 'nightbane')
    expect(secondary?.raceAudience).toBe('player')
    expect(secondary?.raceComposition).toBe('rcc')
    expect(secondary?.forcedOccId).toBe('occ_secondary_vampire_rcc')
    expect(secondary?.vitals.hpFormula).toBe('3D4*10')
    expect(secondary?.psionics.naturalIspFormula).toBe('2D6*10')
    expect(secondary?.innateBonuses.metadata?.vampireTier).toBe('secondary')
    expect(secondary?.innateBonuses.metadata?.attacksPerMelee).toBe(5)
    expect(secondary?.innateBonuses.metadata?.majorPsionicSaveTarget).toBe(12)
    expect(secondary?.innateBonuses.metadata?.vampireSlaveCap).toBe(1)
    expect(secondary?.innateBonuses.metadata?.susceptibleToMasterMindControl).toBe(true)
    const secondarySlowKill = secondary?.innateBonuses.metadata?.slowKillOutcomeRoll as
      | Record<string, string>
      | undefined
    expect(secondarySlowKill?.['45-00']).toBe('race_wild_vampire')
    expect(secondary?.innateBonuses.activation?.cost?.type).toBe('other')
    expect(secondary?.innateBonuses.metadata?.hierarchyMasterRaceId).toBe('race_master_vampire')
    expect(secondary?.innateBonuses.metadata?.pcMaxGoodAlignment).toBe('Unprincipled')
    expect(master?.innateBonuses.metadata?.createsUndeadRaceId).toBe('race_secondary_vampire')
    expect(secondary?.classAbilities?.some((a) => a.name === 'A Lust for Blood')).toBe(true)
  })

  it('excludes other genres from creation list', () => {
    const riftsPool = listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'rifts')
    expect(riftsPool.map((r) => r.id)).toEqual(['race_human'])
  })

  it('excludes npc pool from character creation', () => {
    const npcOnly = [
      {
        ...PALLADIUM_RACE_CATALOG[0]!,
        id: 'race_test_npc',
        raceAudience: 'npc' as const,
      },
    ]
    expect(raceAllowedInCharacterCreation(npcOnly[0]!, 'nightbane')).toBe(false)
    expect(listNpcRaces(npcOnly, 'nightbane').length).toBe(1)
    expect(listRacesForCharacterCreation(npcOnly, 'nightbane').length).toBe(0)
  })

  it('loads hound from nightbane npc pool', () => {
    const hound = getPalladiumRaceById('race_hound', 'nightbane')
    expect(hound?.raceAudience).toBe('npc')
    expect(hound?.vitals.sdc).toBe(200)
    expect(hound?.innateBonuses.metadata?.armorRatingNormal).toBe(13)
    expect(hound?.innateBonuses.metadata?.supernaturalTrackingRangeFeet).toBe(60)
    expect(hound?.demographics.excludedAlignments).toContain('Miscreant')
    const npcPool = listNpcRaces(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(npcPool.some((r) => r.id === 'race_hound')).toBe(true)
    expect(npcPool.some((r) => r.id === 'race_hunter')).toBe(true)
    expect(npcPool.length).toBe(18)
  })

  it('loads hunter from nightbane npc pool with pass B metadata', () => {
    const hunter = getPalladiumRaceById('race_hunter', 'nightbane')
    expect(hunter?.raceAudience).toBe('npc')
    expect(hunter?.vitals.sdc).toBe(180)
    expect(hunter?.innateBonuses.metadata?.flyingSpeedFormula).toBe('1D4*10+40')
    expect(hunter?.innateBonuses.metadata?.supernaturalTrackingRangeFeet).toBe(100)
    expect(hunter?.innateBonuses.metadata?.damageMultiplierArtifactWeaponsAndPowers).toBe(2)
    expect(hunter?.innateBonuses.metadata?.typicalAllyRaceId).toBe('race_hound')
    expect(hunter?.demographics.excludedAlignments).toContain('Miscreant')
  })

  it('loads ashmedai from nightbane npc pool with pass B metadata', () => {
    const ashmedai = getPalladiumRaceById('race_ashmedai', 'nightbane')
    expect(ashmedai?.raceAudience).toBe('npc')
    expect(ashmedai?.vitals.sdc).toBe('3D6*10+150')
    expect(ashmedai?.psionics.naturalIspFormula).toBe('2D4*10+20')
    expect(ashmedai?.innateBonuses.metadata?.individualMimicryBasePercent).toBe(25)
    expect(ashmedai?.innateBonuses.metadata?.psionicGrantIds).toContain('psionic_telepathy')
    expect(ashmedai?.innateBonuses.activation?.cost?.type).toBe('action')
    expect(ashmedai?.demographics.excludedAlignments).not.toContain('Miscreant')
    expect(ashmedai?.demographics.excludedAlignments).not.toContain('Aberrant')
  })

  it('loads namtar from nightbane npc pool with pass B metadata', () => {
    const namtar = getPalladiumRaceById('race_namtar', 'nightbane')
    expect(namtar?.raceAudience).toBe('npc')
    expect(namtar?.vitals.sdc).toBe(10)
    expect(namtar?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_hollow_man')
    expect(namtar?.innateBonuses.metadata?.armorRatingBeetle).toBe(12)
    expect(namtar?.innateBonuses.metadata?.constructDestroyThresholdSdc).toBe(-25)
    expect(namtar?.innateBonuses.activation?.cost?.type).toBe('other')
    expect(namtar?.demographics.excludedAlignments).toContain('Aberrant')
  })

  it('loads master vampire from npc pool with pass B metadata', () => {
    const master = getPalladiumRaceById('race_master_vampire', 'nightbane')
    const secondary = getPalladiumRaceById('race_secondary_vampire', 'nightbane')
    expect(master?.raceAudience).toBe('npc')
    expect(master?.raceComposition).toBe('rcc')
    expect(master?.forcedOccId).toBe('occ_master_vampire_rcc')
    expect(master?.vitals.hpFormula).toBe('3D6*10')
    expect(master?.psionics.naturalIspFormula).toBe('3D6*10')
    expect(master?.strengthCategory).toBe('supernatural')
    expect(master?.innateBonuses.metadata?.initiativeBonus).toBe(3)
    expect(master?.innateBonuses.metadata?.vampireTier).toBe('master')
    expect(master?.innateBonuses.metadata?.attacksPerMelee).toBe(6)
    expect(master?.innateBonuses.metadata?.vampireSlaveCap).toBe(2)
    expect(master?.innateBonuses.metadata?.telepathicLinkMinions).toBe(true)
    expect(master?.innateBonuses.metadata?.createsUndeadRaceId).toBe('race_secondary_vampire')
    expect(master?.innateBonuses.activation?.cost?.type).toBe('other')
    expect(master?.innateBonuses.metadata?.trueVampirePowersModuleId).toBe(
      'nightbane_true_vampire',
    )
    expect(master?.demographics.excludedAlignments).toContain('Principled')
    expect(secondary?.innateBonuses.metadata?.hierarchyMasterRaceId).toBe('race_master_vampire')
    expect(master?.classAbilities?.some((a) => a.name === 'A Lust for Blood')).toBe(true)
  })

  it('loads priest of night from npc pool with pass B metadata', () => {
    const priest = getPalladiumRaceById('race_priest_of_night', 'nightbane')
    const avatar = getPalladiumRaceById('race_nightlord_avatar', 'nightbane')
    const prince = getPalladiumRaceById('race_night_prince', 'nightbane')
    expect(priest?.raceAudience).toBe('npc')
    expect(priest?.raceComposition).toBe('rcc')
    expect(priest?.attributes.ps).toBe('3D6')
    expect(priest?.innateBonuses.modifiers?.ps).toBe(4)
    expect(priest?.innateBonuses.metadata?.speciesBaselineRaceId).toBe('race_human')
    expect(priest?.innateBonuses.metadata?.giftOfPowerMaPbMinimum).toBe(18)
    expect(priest?.innateBonuses.metadata?.superhumanStrengthPpePerMinute).toBe(2)
    expect(priest?.innateBonuses.metadata?.recruitedByRaceIds).toEqual([
      'race_nightlord_avatar',
      'race_night_prince',
    ])
    expect(priest?.innateBonuses.activation?.cost?.type).toBe('ppe')
    expect(priest?.vitals.sdc).toBe('3D6+30')
    expect(priest?.vitals.hpFormula).toBe('PE+1D6+3D6')
    expect(priest?.forcedOccId).toBe('occ_priest_of_night_rcc')
    expect(priest?.demographics.excludedAlignments).toContain('Aberrant')
    expect(avatar?.innateBonuses.metadata?.recruitsFanaticRaceIds).toContain('race_priest_of_night')
    expect(prince?.innateBonuses.metadata?.recruitsFanaticRaceIds).toContain('race_priest_of_night')
  })

  it('loads night prince from gm_approval pool with pass B metadata', () => {
    const prince = getPalladiumRaceById('race_night_prince', 'nightbane')
    expect(prince?.raceAudience).toBe('gm_approval')
    expect(prince?.raceComposition).toBe('rcc')
    expect(prince?.forcedOccId).toBe('occ_night_prince_rcc')
    expect(prince?.innateBonuses.metadata?.associatedBossRaceId).toBe('race_nightlord')
    expect(prince?.innateBonuses.metadata?.illusionPpeFullSensoryPerMinute).toBe(20)
    expect(prince?.innateBonuses.activation?.cost?.type).toBe('ppe')
    expect(prince?.demographics.excludedAlignments).toContain('Aberrant')
    expect(
      listGmApprovalRaces(PALLADIUM_RACE_CATALOG, 'nightbane').some(
        (r) => r.id === 'race_night_prince',
      ),
    ).toBe(true)
    expect(prince?.vitals.sdc).toBe('2D4*10+120')
  })

  it('loads namtar from nightbane npc pool', () => {
    const namtar = getPalladiumRaceById('race_namtar', 'nightbane')
    expect(namtar?.raceAudience).toBe('npc')
    expect(namtar?.vitals.sdc).toBe(10)
    expect(namtar?.strengthCategory).toBe('standard')
    expect(namtar?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_hollow_man')
  })

  it('links hollow man construct to namtar pilot with pass B metadata', () => {
    const hollow = getPalladiumRaceById('race_hollow_man', 'nightbane')
    const namtar = getPalladiumRaceById('race_namtar', 'nightbane')
    expect(hollow?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_namtar')
    expect(hollow?.vitals.hpFormula).toBe('0')
    expect(hollow?.vitals.sdc).toBe('2D4*10+80')
    expect(hollow?.innateBonuses.metadata?.armorRatingConstruct).toBe(8)
    expect(hollow?.innateBonuses.metadata?.destroyThresholdSdc).toBe(-25)
    expect(hollow?.innateBonuses.metadata?.ppeAndSkillsBelongToPilotRaceId).toBe('race_namtar')
    expect(hollow?.demographics.excludedAlignments).toContain('Aberrant')
    expect(namtar?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_hollow_man')
  })

  it('links nightlord avatars to parent nightlord with pass B metadata', () => {
    const lord = getPalladiumRaceById('race_nightlord', 'nightbane')
    const avatar = getPalladiumRaceById('race_nightlord_avatar', 'nightbane')
    expect(lord?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_nightlord_avatar')
    expect(lord?.innateBonuses.metadata?.regenerationPerMelee).toBe(20)
    expect(lord?.innateBonuses.metadata?.damageMultiplierNightbaneAndGuardian).toBe(3)
    expect(lord?.innateBonuses.activation?.cost?.type).toBe('other')
    expect(lord?.demographics.excludedAlignments).toContain('Anarchist')
    expect(avatar?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_nightlord')
    expect(avatar?.innateBonuses.metadata?.inheritsPowersFromParentRaceId).toBe('race_nightlord')
    expect(avatar?.innateBonuses.metadata?.regenerationPerMelee).toBe('2D6')
    expect(avatar?.innateBonuses.metadata?.astralAvatarNoSilverCord).toBe(true)
    expect(lord?.vitals.sdc).toBe('3D6*100+500')
    expect(avatar?.vitals.sdc).toBe('1D4*100+100')
  })

  it('loads ashmedai from nightbane npc pool', () => {
    const ashmedai = getPalladiumRaceById('race_ashmedai', 'nightbane')
    expect(ashmedai?.raceAudience).toBe('npc')
    expect(ashmedai?.psionics.capabilityType).toBe('innate')
    expect(ashmedai?.vitals.sdc).toBe('3D6*10+150')
  })

  it('loads hound master from gm_approval pool with pass B metadata', () => {
    const master = getPalladiumRaceById('race_hound_master', 'nightbane')
    expect(master?.raceAudience).toBe('gm_approval')
    expect(master?.raceComposition).toBe('rcc')
    expect(master?.forcedOccId).toBe('occ_hound_master_rcc')
    expect(master?.innateBonuses.metadata?.illusionShellIspSelf).toBe(4)
    expect(master?.innateBonuses.metadata?.associatedMinionRaceId).toBe('race_hound')
    expect(master?.innateBonuses.activation?.cost?.type).toBe('isp')
    expect(isGmApprovalRacePool(master!)).toBe(true)
    expect(
      listGmApprovalRaces(PALLADIUM_RACE_CATALOG, 'nightbane').some(
        (r) => r.id === 'race_hound_master',
      ),
    ).toBe(true)
    expect(
      listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane').some(
        (r) => r.id === 'race_hound_master',
      ),
    ).toBe(false)
  })

  it('loads snake bird from gm_approval pool with pass B metadata', () => {
    const snakeBird = getPalladiumRaceById('race_snake_bird', 'nightbane')
    expect(snakeBird?.raceAudience).toBe('gm_approval')
    expect(snakeBird?.raceComposition).toBe('rcc')
    expect(snakeBird?.forcedOccId).toBe('occ_snake_bird_rcc')
    expect(snakeBird?.psionics.capabilityType).toBe('none')
    expect(snakeBird?.vitals.sdc).toBe('5D6')
    expect(snakeBird?.attributes.spd).toBe('1D6*10+50')
    expect(snakeBird?.innateBonuses.metadata?.naturalAttacksPerMeleeLevel1).toBe(3)
    expect(snakeBird?.innateBonuses.metadata?.poisonFirstRoundHpDamage).toBe('3D6')
    expect(snakeBird?.innateBonuses.activation?.cost?.type).toBe('action')
    expect(listGmApprovalRaces(PALLADIUM_RACE_CATALOG, 'nightbane').length).toBe(6)
  })

  it('loads waste coyote from creatures pool with pass B metadata', () => {
    const coyote = getPalladiumRaceById('race_waste_coyote', 'nightbane')
    expect(coyote?.raceAudience).toBe('creature')
    expect(coyote?.raceComposition).toBe('creature')
    expect(coyote?.vitals.sdc).toBe('2D6*10+20')
    expect(coyote?.forcedOccId).toBeUndefined()
    expect(coyote?.innateBonuses.metadata?.naturalAttacksPerMelee).toBe(3)
    expect(coyote?.innateBonuses.metadata?.avoidsRaceId).toBe('race_lizard_king')
    expect(coyote?.innateBonuses.metadata?.predatorEnemyRaceIds).toContain('race_hound')
    expect(coyote?.demographics.excludedAlignments).toContain('Diabolic')
    const creatures = listCreatureRaces(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(creatures.some((r) => r.id === 'race_waste_coyote')).toBe(true)
    expect(
      listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane').some(
        (r) => r.id === 'race_waste_coyote',
      ),
    ).toBe(false)
  })

  it('loads doppleganger with pass B metadata and rcc composition', () => {
    const doppel = getPalladiumRaceById('race_doppleganger', 'nightbane')
    expect(doppel?.raceComposition).toBe('rcc')
    expect(doppel?.forcedOccId).toBe('occ_doppleganger_rcc')
    expect(doppel?.innateBonuses.metadata?.speciesBaselineRaceId).toBe('race_human')
    expect(doppel?.innateBonuses.metadata?.earthSurvivalHoursWithoutDoubleResolution).toBe(48)
    expect(doppel?.innateBonuses.modifiers?.save_horror_factor).toEqual({
      value: 2,
      condition: 'Awakened Doppleganger only (all player characters)',
    })
    expect(doppel?.occLimitations.forbiddenOccIds).toContain('occ_nightbane_basic')
  })

  it('loads lizard king from creatures pool with pass B metadata', () => {
    const lizard = getPalladiumRaceById('race_lizard_king', 'nightbane')
    expect(lizard?.raceComposition).toBe('creature')
    expect(lizard?.vitals.hpFormula).toBe('1D6*10+20')
    expect(lizard?.vitals.sdc).toBe('2D6*10+100')
    expect(lizard?.attributes.ps).toBe('2D6+29')
    expect(lizard?.innateBonuses.metadata?.armorRatingNormal).toBe(12)
    expect(lizard?.innateBonuses.metadata?.psychicVampireFeeding).toBe(true)
    expect(lizard?.innateBonuses.metadata?.fearedByRaceId).toBe('race_waste_coyote')
    expect(lizard?.innateBonuses.metadata?.huntedByRaceIds).toContain('race_hunter')
    expect(lizard?.demographics.excludedAlignments).toContain('Miscreant')
    expect(listCreatureRaces(PALLADIUM_RACE_CATALOG, 'nightbane').length).toBe(6)
  })
})
