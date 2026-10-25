import { describe, expect, it } from 'vitest'
import {
  buildLiveSheetAbilitySections,
  filterLiveSheetAbilitySection,
  isLiveSheetAbilityCategoryAvailable,
  isLiveSheetOccAbility,
  isLiveSheetRaceNaturalAbility,
  listLiveSheetAbilityTypeFilterOptions,
  listLiveSheetMorphusNaturalAbilities,
  listLiveSheetNaturalAbilities,
  listLiveSheetOccAbilities,
  listLiveSheetRccAbilitiesAsNatural,
} from './liveSheetAbilities'
import type { MorphusCharacteristic, OccClassAbility, PalladiumOcc, Race } from '../types'
import { createBlankCharacterForGenre } from './characterRoot'

describe('liveSheetAbilities', () => {
  it('omits empty ability categories', () => {
    const blank = createBlankCharacterForGenre('nightbane')
    const sections = buildLiveSheetAbilitySections({
      race: undefined,
      occ: undefined,
      characterLevel: 1,
      selectedAbilityIds: [],
      activeForm: 'primary',
      genreId: 'nightbane',
    })
    expect(sections).toEqual([])
    expect(blank.selectedAbilities ?? []).toEqual([])
  })

  it('includes only race abilities marked sheetUsage gameplay', () => {
    const race = {
      id: 'race_test',
      name: 'Test Race',
      classAbilities: [
        { name: 'Creation fluff', description: 'Forge only.', sheetUsage: 'creation' },
        {
          name: 'Nightvision',
          description: 'See in darkness.',
          sheetUsage: 'gameplay',
        },
      ],
    } as unknown as Race

    const sections = buildLiveSheetAbilitySections({
      race,
      occ: undefined,
      characterLevel: 3,
      selectedAbilityIds: [],
      activeForm: 'primary',
      genreId: 'nightbane',
    })

    expect(sections.map((s) => s.id)).toEqual(['natural'])
    expect(sections[0]?.naturalRows?.map((r) => r.name)).toEqual(['Nightvision'])
    expect(isLiveSheetRaceNaturalAbility(race.classAbilities![0]!)).toBe(false)
    expect(isLiveSheetRaceNaturalAbility(race.classAbilities![1]!)).toBe(true)
  })

  it('formats Nightbane senses and Mirror Walk for the live sheet', () => {
    const race = {
      id: 'race_nightbane',
      name: 'Nightbane',
      innateBonuses: {
        activation: {
          cost: {
            type: 'ppe',
            value: '2 (+1 per 2 lb passengers/cargo beyond clothes)',
          },
          duration: '1 melee round (15 seconds)',
          save: 'Morphus only — Mirror Walk to/from Nightlands via mirrored counterpart',
        },
        metadata: {
          nightvisionFacadeFeet: 200,
          nightvisionMorphusFeet: 500,
          senseNightbaneBaseFeet: 300,
          senseNightbanePerLevelFeet: 30,
          vehicleMirrorsRarelyWork: true,
        },
      },
      classAbilities: [
        {
          name: 'Dual Identity',
          description: 'Creation lore.',
          sheetUsage: 'creation',
        },
        {
          name: 'Supernatural Senses',
          description: 'Prose fallback.',
          sheetUsage: 'gameplay',
        },
        {
          name: 'Mirror Walk',
          description: 'Prose fallback.',
          sheetUsage: 'gameplay',
        },
      ],
    } as unknown as Race

    const facade = listLiveSheetNaturalAbilities({
      race,
      characterLevel: 3,
      activeForm: 'primary',
    })
    expect(facade.map((r) => r.name)).toEqual([
      'Supernatural Senses',
      'Mirror Walk',
    ])
    expect(facade[0]?.detailLines).toEqual([
      'Nightvision: 200 ft (Facade)',
      'Sense other Nightbane: 360 ft',
    ])

    const morphus = listLiveSheetNaturalAbilities({
      race,
      characterLevel: 3,
      activeForm: 'morphus',
      morphusTraits: [
        {
          id: 'alien_shape_abnormally_large_sensory_organs',
          name: 'Abnormally Large Sensory Organs',
          sensory: { nightvisionRangeFlatBonus: 2000, hawkLikeDayVision: true },
        } as MorphusCharacteristic,
      ],
    })
    expect(morphus[0]?.detailLines?.[0]).toBe(
      'Nightvision: 2500 ft (Morphus 500 + 2000 traits)',
    )
    expect(morphus.map((r) => r.name)).toContain('Hawk-like vision')
    expect(morphus[1]?.metaLine).toBe(
      '2 (+1 per 2 lb passengers/cargo beyond clothes) P.P.E.',
    )
  })

  it('lists Morphus sensory abilities as Morphus-only natural rows', () => {
    const rows = listLiveSheetMorphusNaturalAbilities({
      morphusTraits: [
        {
          id: 'animal_avian_full_bird',
          name: 'Full Bird',
          tableCategory: 'animal',
          sensory: { hawkLikeDayVision: true },
          customOneOffs: [
            'Exceptional vision: can see a rabbit or read a sign two miles (3.2 km) away.',
          ],
          atWillAbilities: [{ id: 'other', label: 'Wing buffet', note: 'Knockback.' }],
        } as MorphusCharacteristic,
      ],
      activeForm: 'primary',
      characterLevel: 1,
    })
    expect(rows.map((r) => r.name)).toEqual(['Hawk-like vision', 'Wing buffet'])
    expect(rows[0]?.description).toMatch(/two miles/)
    expect(rows.every((r) => r.morphusOnly && r.formRestricted)).toBe(true)
  })

  it('puts O.C.C. class abilities in the occ section, not natural', () => {
    const occ = {
      id: 'occ_pab_field_agent',
      name: 'P.A.B. Field Agent',
      occType: 'standard',
      classAbilities: [
        {
          name: 'Special Anti-Supernatural Bonuses',
          description: 'Bypass supernatural A.R.',
          sheetUsage: 'gameplay',
        },
        {
          name: 'Related skill picks',
          description: 'Choose related skills.',
        },
      ],
    } as unknown as PalladiumOcc

    const sections = buildLiveSheetAbilitySections({
      race: undefined,
      occ,
      characterLevel: 2,
      selectedAbilityIds: [],
      activeForm: 'primary',
      genreId: 'nightbane',
    })
    expect(sections.map((s) => s.id)).toEqual(['occ'])
    expect(sections[0]?.naturalRows?.map((r) => r.name)).toEqual([
      'Special Anti-Supernatural Bonuses',
    ])
    expect(
      listLiveSheetOccAbilities({ occ, characterLevel: 2 }).map((r) => r.name),
    ).toEqual(['Special Anti-Supernatural Bonuses'])
  })

  it('routes R.C.C. shadow O.C.C. abilities under Natural, not OCC', () => {
    const race = {
      id: 'race_guardian',
      name: 'Guardian',
      raceComposition: 'rcc',
      forcedOccId: 'occ_guardian_rcc',
      classAbilities: [],
    } as unknown as Race
    const occ = {
      id: 'occ_guardian_rcc',
      name: 'Guardian (R.C.C.)',
      occType: 'standard',
      classAbilities: [
        {
          name: 'Supernatural Strength',
          description: 'Lift tons.',
          sheetUsage: 'gameplay',
        },
        {
          name: 'Related skill picks',
          description: 'Choose related skills.',
        },
      ],
    } as unknown as PalladiumOcc

    const rccRows = listLiveSheetRccAbilitiesAsNatural({
      race,
      occ,
      characterLevel: 1,
    })
    expect(rccRows.map((r) => r.name)).toEqual(['Supernatural Strength'])
    expect(rccRows[0]?.source).toBe('race')
    expect(rccRows[0]?.sourceLabel).toBe('Guardian')

    const sections = buildLiveSheetAbilitySections({
      race,
      occ,
      characterLevel: 1,
      selectedAbilityIds: [],
      activeForm: 'primary',
      genreId: 'nightbane',
    })
    expect(sections.map((s) => s.id)).toEqual(['natural'])
    expect(sections[0]?.naturalRows?.map((r) => r.name)).toEqual([
      'Supernatural Strength',
    ])
    expect(
      isLiveSheetAbilityCategoryAvailable({
        categoryId: 'occ',
        race,
        occ,
      }),
    ).toBe(false)
  })

  it('shows empty available categories when emptyPolicy is show-if-available', () => {
    const race = {
      id: 'race_human',
      name: 'Human',
      raceComposition: 'character',
      classAbilities: [],
    } as unknown as Race
    const occ = {
      id: 'occ_mage',
      name: 'Mage',
      occType: 'standard',
      ppeEngine: { magicSchools: ['invocation'] },
      classAbilities: [],
    } as unknown as PalladiumOcc

    const omitted = buildLiveSheetAbilitySections({
      race,
      occ,
      characterLevel: 1,
      selectedAbilityIds: [],
      activeForm: 'primary',
      genreId: 'nightbane',
      abilityBudget: { spellSlots: 2, psionicSlots: 0, talentSlots: 0 },
      emptyPolicy: 'omit',
    })
    expect(omitted).toEqual([])

    const combat = buildLiveSheetAbilitySections({
      race,
      occ,
      characterLevel: 1,
      selectedAbilityIds: [],
      activeForm: 'primary',
      genreId: 'nightbane',
      abilityBudget: { spellSlots: 2, psionicSlots: 0, talentSlots: 0 },
      emptyPolicy: 'show-if-available',
    })
    expect(combat.map((s) => s.id)).toEqual(['natural', 'occ', 'magic'])
    expect(combat.find((s) => s.id === 'magic')?.catalogRows).toEqual([])
  })

  it('filters O.C.C. skill-program boilerplate from O.C.C. abilities', () => {
    const occ = {
      id: 'occ_test',
      name: 'Test Occ',
      occType: 'standard',
      classAbilities: [
        { name: 'Related skill picks', description: 'Choose related skills.' },
        { name: 'Recognize supernatural', description: 'Sense the inhuman.' },
        {
          name: 'Package note',
          description: 'Creation only.',
          sheetUsage: 'creation',
        },
        {
          name: 'Ley Line Sense',
          description: 'Feel ley lines.',
          sheetUsage: 'gameplay',
        },
      ],
    } as unknown as PalladiumOcc

    expect(
      isLiveSheetOccAbility(occ.classAbilities![0] as OccClassAbility, occ),
    ).toBe(false)
    expect(
      isLiveSheetOccAbility(occ.classAbilities![1] as OccClassAbility, occ),
    ).toBe(true)
    expect(
      isLiveSheetOccAbility(occ.classAbilities![2] as OccClassAbility, occ),
    ).toBe(false)
    expect(
      isLiveSheetOccAbility(occ.classAbilities![3] as OccClassAbility, occ),
    ).toBe(true)
  })

  it('sorts ability lists alphabetically by name', () => {
    const race = {
      id: 'race_test',
      name: 'Test Race',
      classAbilities: [
        { name: 'Zebra Sense', description: 'Z.', sheetUsage: 'gameplay' },
        { name: 'Alpha Sight', description: 'A.', sheetUsage: 'gameplay' },
      ],
    } as unknown as Race

    const sections = buildLiveSheetAbilitySections({
      race,
      occ: undefined,
      characterLevel: 1,
      selectedAbilityIds: [],
      activeForm: 'primary',
      genreId: 'nightbane',
    })
    expect(sections[0]?.naturalRows?.map((r) => r.name)).toEqual([
      'Alpha Sight',
      'Zebra Sense',
    ])
  })

  it('filters catalog abilities by type and name (AND)', () => {
    const sections = buildLiveSheetAbilitySections({
      race: undefined,
      occ: undefined,
      characterLevel: 1,
      selectedAbilityIds: [
        'magic_wizard_energy_bolt',
        'talent_all_nighter',
      ],
      activeForm: 'primary',
      genreId: 'nightbane',
    })
    const magic = sections.find((s) => s.id === 'magic')
    expect(magic).toBeDefined()
    const typeOpts = listLiveSheetAbilityTypeFilterOptions(magic!, 'nightbane')
    expect(typeOpts.some((o) => o.value.startsWith('level:'))).toBe(true)

    const levelKey = magic!.catalogRows?.[0]?.typeFilterKeys?.[0]
    expect(levelKey).toMatch(/^level:/)
    const byLevel = filterLiveSheetAbilitySection(magic!, {
      typeKey: levelKey,
      nameQuery: 'energy',
    })
    expect(byLevel.catalogRows?.some((r) => /energy/i.test(r.name))).toBe(true)
    expect(
      filterLiveSheetAbilitySection(magic!, {
        typeKey: levelKey,
        nameQuery: 'zzzz-no-match',
      }).catalogRows,
    ).toEqual([])

    const talents = sections.find((s) => s.id === 'talents')
    expect(talents).toBeDefined()
    const talentOpts = listLiveSheetAbilityTypeFilterOptions(
      talents!,
      'nightbane',
    )
    expect(talentOpts.map((o) => o.value)).toContain('common')
    expect(
      listLiveSheetAbilityTypeFilterOptions(
        { id: 'natural', label: 'Natural', naturalRows: [] },
        'nightbane',
      ),
    ).toEqual([])
  })
})
