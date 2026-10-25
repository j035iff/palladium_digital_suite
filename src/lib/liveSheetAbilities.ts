import { getAbilityById, type AbilityCategory } from '../data/abilityLibrary'
import {
  formatMagicPpeCost,
  formatPsionicIspCost,
  getFeatureById,
  getPalladiumMagicSpellById,
  getPalladiumPsionicById,
  getPalladiumTalentById,
} from '../data/library/registry'
import type {
  ActiveForm,
  MorphusCharacteristic,
  OccClassAbility,
  PalladiumOcc,
  Race,
} from '../types'
import { featureAppliesToForm } from './featureEngine'
import { stackNightvisionRangeFlatBonus } from './morphusCharacteristicAggregation'
import { isRccRace } from './raceComposition'
import { psionicCategoryFilterLabel } from './psionicCategoryLabels'
import { talentCatalogTier } from './talentSelectionGates'

export type LiveSheetAbilityCategoryId =
  | 'natural'
  | 'occ'
  | 'magic'
  | 'psionics'
  | 'talents'

/** Empty-category policy for live Abilities lists (strip vs Combat). */
export type LiveSheetAbilityEmptyPolicy = 'omit' | 'show-if-available'

export type LiveSheetAbilityBudgetHint = {
  spellSlots: number
  psionicSlots: number
  talentSlots: number
}

export type LiveNaturalAbilityRow = {
  id: string
  name: string
  description: string
  source: 'race' | 'morphus' | 'occ'
  sourceLabel: string
  percentileLine?: string
  /** Cost / activation summary (e.g. Mirror Walk P.P.E.). */
  metaLine?: string
  /** Nested gameplay details (e.g. Nightvision / Sense ranges). */
  detailLines?: string[]
  morphusOnly?: boolean
  formRestricted?: boolean
}

export type LiveCatalogAbilityRow = {
  id: string
  name: string
  description: string
  metaLine?: string
  morphusOnly?: boolean
  formRestricted?: boolean
  /**
   * Type-filter keys for this row (magic level / psionic pool / talent tier).
   * Natural / OCC rows omit these — no filter UI when none present.
   */
  typeFilterKeys?: readonly string[]
}

export type LiveSheetAbilitySection = {
  id: LiveSheetAbilityCategoryId
  label: string
  /** Race / Morphus / O.C.C. list rows (Natural + O.C.C. tabs). */
  naturalRows?: LiveNaturalAbilityRow[]
  catalogRows?: LiveCatalogAbilityRow[]
}

/** Familiar Surface “All” sentinel for ability type filters (Skills-style). */
export const LIVE_ABILITY_FILTER_ALL_TYPES = ''

export type LiveSheetAbilityListFilter = {
  /** Empty / {@link LIVE_ABILITY_FILTER_ALL_TYPES} = no type filter. */
  typeKey?: string
  nameQuery?: string
}

export type LiveSheetAbilityTypeFilterOption = {
  value: string
  label: string
}

export const LIVE_SHEET_ABILITY_CATEGORY_ORDER: readonly LiveSheetAbilityCategoryId[] =
  ['natural', 'occ', 'magic', 'psionics', 'talents'] as const

/** Sub-tab pill labels — strip Abilities + Combat Abilities (Unified Path). */
export const LIVE_SHEET_ABILITY_CATEGORY_PILL_LABELS: Record<
  LiveSheetAbilityCategoryId,
  string
> = {
  natural: 'Natural',
  occ: 'OCC',
  magic: 'Magic',
  psionics: 'Psionics',
  talents: 'Talents',
}

const CATEGORY_ORDER = LIVE_SHEET_ABILITY_CATEGORY_ORDER

const CATEGORY_LABELS: Record<LiveSheetAbilityCategoryId, string> = {
  natural: 'Natural abilities',
  occ: 'O.C.C. abilities',
  magic: 'Magic',
  psionics: 'Psionics',
  talents: 'Talents',
}

const ABILITY_CATEGORY_TO_SECTION: Record<
  AbilityCategory,
  Exclude<LiveSheetAbilityCategoryId, 'natural' | 'occ'>
> = {
  Spell: 'magic',
  Psionic: 'psionics',
  Talent: 'talents',
}

/** Skill-program / boilerplate O.C.C. notes — not live O.C.C. abilities. */
const OCC_SKILL_PROGRAM_ABILITY_PATTERN =
  /background skill|pre-transformation skill|limited skill memory|facade hand to hand|civilian weapon|native literacy|^literacy$|related skill|secondary skill|weapon proficienc|hand to hand:|hand to hand must|core skill|skill pick|skill program|skill package|select literacy|starting resources|dark day|faction cross|campaign default|gm skill flexibility|morphus innate combat|street survival|optional player r\.c\.c|origin & mystery|^alignment$|appearance & exposure|non-lethal ethos|hand to hand program|paranormal field experience|r&d and field research|^o\.c\.c\. bonuses$/i

const OCC_STAT_BUNDLE_ABILITY_PATTERN = /^physical bonuses$|^combat bonuses$/i

const OCC_PSIONIC_CLASS_BOILERPLATE_PATTERN =
  /^master psionic$|^major psionic$|^minor psionic$/i

/** @deprecated Prefer {@link isLiveSheetOccAbility}. */
export function isLiveSheetOccNaturalAbility(
  ability: OccClassAbility,
  occ: PalladiumOcc,
): boolean {
  return isLiveSheetOccAbility(ability, occ)
}

export function isLiveSheetOccAbility(
  ability: OccClassAbility,
  occ: PalladiumOcc,
): boolean {
  if (ability.sheetUsage === 'creation') return false
  if (ability.sheetUsage === 'gameplay') return true

  const name = ability.name.trim()
  const haystack = `${name} ${ability.description}`.toLowerCase()
  if (OCC_STAT_BUNDLE_ABILITY_PATTERN.test(name)) return false
  if (OCC_SKILL_PROGRAM_ABILITY_PATTERN.test(haystack)) return false
  if (
    occ.occType === 'psychic' &&
    OCC_PSIONIC_CLASS_BOILERPLATE_PATTERN.test(name.toLowerCase())
  ) {
    return false
  }
  if (/^initial psionic grants$/i.test(name)) return false
  return true
}

/** Race class abilities are opt-in via `sheetUsage: gameplay` (creation packages stay off the live sheet). */
export function isLiveSheetRaceNaturalAbility(ability: OccClassAbility): boolean {
  return ability.sheetUsage === 'gameplay'
}

function percentileLine(
  ability: OccClassAbility,
  characterLevel: number,
): string | undefined {
  const profile = ability.percentileProfile
  if (!profile) return undefined
  const lv = Math.max(1, Math.floor(characterLevel))
  const total =
    profile.basePercent + Math.max(0, lv - 1) * profile.perLevelPercent
  return `${total}% at level ${lv} (base ${profile.basePercent}% + ${profile.perLevelPercent}%/level)`
}

function metaNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function formatNightbaneSupernaturalSenses(input: {
  race: Race
  activeForm: ActiveForm
  characterLevel: number
  morphusTraits?: readonly MorphusCharacteristic[]
}): { detailLines: string[]; description: string } | undefined {
  const meta = input.race.innateBonuses?.metadata as
    | Record<string, unknown>
    | undefined
  if (!meta) return undefined

  const level = Math.max(1, Math.floor(input.characterLevel))
  const inMorphus = input.activeForm === 'morphus'
  const facadeFeet = metaNumber(meta.nightvisionFacadeFeet) ?? 200
  const morphusFeet = metaNumber(meta.nightvisionMorphusFeet) ?? 500
  const traitNv =
    inMorphus && input.morphusTraits?.length
      ? stackNightvisionRangeFlatBonus(input.morphusTraits)
      : 0
  const nightvisionFeet = inMorphus ? morphusFeet + traitNv : facadeFeet
  const senseBase = metaNumber(meta.senseNightbaneBaseFeet) ?? 300
  const sensePerLevel = metaNumber(meta.senseNightbanePerLevelFeet) ?? 30
  const senseFeet = senseBase + Math.max(0, level - 1) * sensePerLevel

  const nightvisionLine =
    inMorphus && traitNv > 0
      ? `Nightvision: ${nightvisionFeet} ft (Morphus ${morphusFeet} + ${traitNv} traits)`
      : `Nightvision: ${nightvisionFeet} ft (${inMorphus ? 'Morphus' : 'Facade'})`

  return {
    detailLines: [
      nightvisionLine,
      `Sense other Nightbane: ${senseFeet} ft`,
    ],
    description:
      'Automatic recognition when visible; Perception roll for direction/distance when not.',
  }
}

function formatNightbaneMirrorWalk(race: Race): {
  description: string
  metaLine: string
} | undefined {
  const activation = race.innateBonuses?.activation
  const meta = race.innateBonuses?.metadata as Record<string, unknown> | undefined
  const cost = activation?.cost
  const ppe =
    cost?.type === 'ppe' && cost.value != null
      ? String(cost.value)
      : metaNumber(meta?.mirrorWalkPpe) != null
        ? String(metaNumber(meta?.mirrorWalkPpe))
        : undefined
  if (!ppe && !activation) return undefined

  const duration =
    typeof activation?.duration === 'string' ? activation.duration.trim() : ''
  const saveNote =
    typeof activation?.save === 'string' ? activation.save.trim() : ''
  const parts = [
    saveNote || 'Morphus only — cross to/from Nightlands through a mirrored counterpart.',
    duration ? `Duration: ${duration}.` : '',
    meta?.vehicleMirrorsRarelyWork === true
      ? 'Vehicle mirrors rarely have Nightlands counterparts.'
      : '',
  ].filter(Boolean)

  return {
    description: parts.join(' '),
    metaLine: `${ppe} P.P.E.`,
  }
}

function enrichRaceNaturalAbilityRow(input: {
  ability: OccClassAbility
  race: Race
  activeForm: ActiveForm
  characterLevel: number
  index: number
  morphusTraits?: readonly MorphusCharacteristic[]
}): LiveNaturalAbilityRow {
  const raceName = input.race.name?.trim() || 'Race'
  const base: LiveNaturalAbilityRow = {
    id: `race:${input.index}:${input.ability.name}`,
    name: input.ability.name,
    description: input.ability.description.trim(),
    source: 'race',
    sourceLabel: raceName,
    percentileLine: percentileLine(input.ability, input.characterLevel),
  }

  if (input.race.id !== 'race_nightbane') return base

  const name = input.ability.name.trim()
  if (/^supernatural senses$/i.test(name)) {
    const senses = formatNightbaneSupernaturalSenses({
      race: input.race,
      activeForm: input.activeForm,
      characterLevel: input.characterLevel,
      morphusTraits: input.morphusTraits,
    })
    if (senses) {
      return {
        ...base,
        description: senses.description,
        detailLines: senses.detailLines,
      }
    }
  }

  if (/^mirror walk$/i.test(name)) {
    const mirror = formatNightbaneMirrorWalk(input.race)
    if (mirror) {
      return {
        ...base,
        description: mirror.description,
        metaLine: mirror.metaLine,
        morphusOnly: true,
        formRestricted: input.activeForm !== 'morphus',
      }
    }
  }

  return base
}

type MorphusSensoryFlagKey =
  | 'hawkLikeDayVision'
  | 'telescopicVision'
  | 'thermalVision'
  | 'seeInvisible'
  | 'sonarHearing'
  | 'sharpVision'
  | 'sharpHearing'

const MORPHUS_SENSORY_ABILITY_DEFS: readonly {
  key: MorphusSensoryFlagKey
  id: string
  name: string
  fallbackDescription: string
}[] = [
  {
    key: 'hawkLikeDayVision',
    id: 'morphus:hawk-like-vision',
    name: 'Hawk-like vision',
    fallbackDescription:
      'Exceptional daylight vision — identify faces or read small signs at long range (Morphus trait).',
  },
  {
    key: 'telescopicVision',
    id: 'morphus:telescopic-vision',
    name: 'Telescopic vision',
    fallbackDescription: 'Telescopic vision from Morphus traits.',
  },
  {
    key: 'thermalVision',
    id: 'morphus:thermal-vision',
    name: 'Thermal vision',
    fallbackDescription: 'Thermal / heat vision from Morphus traits.',
  },
  {
    key: 'seeInvisible',
    id: 'morphus:see-invisible',
    name: 'See the invisible',
    fallbackDescription: 'Can see invisible beings and objects (Morphus trait).',
  },
  {
    key: 'sonarHearing',
    id: 'morphus:sonar-hearing',
    name: 'Sonar hearing',
    fallbackDescription: 'Sonar / echolocation hearing (Morphus trait).',
  },
  {
    key: 'sharpVision',
    id: 'morphus:sharp-vision',
    name: 'Sharp vision',
    fallbackDescription: 'Unusually sharp vision (Morphus trait).',
  },
  {
    key: 'sharpHearing',
    id: 'morphus:sharp-hearing',
    name: 'Sharp hearing',
    fallbackDescription: 'Unusually sharp hearing (Morphus trait).',
  },
]

function visionOneOff(trait: MorphusCharacteristic): string | undefined {
  return trait.customOneOffs?.find((line) =>
    /vision|hawk|see|sight|eye/i.test(line),
  )
}

/**
 * Morphus-granted senses and at-will powers for the Natural abilities tab.
 * Shown whenever traits exist; grayed when not in Morphus (Radical Visibility).
 */
export function listLiveSheetMorphusNaturalAbilities(input: {
  morphusTraits: readonly MorphusCharacteristic[]
  activeForm: ActiveForm
  characterLevel: number
}): LiveNaturalAbilityRow[] {
  const traits = input.morphusTraits.filter(
    (t) => t.entryRole !== 'table_router' && t.entryRole !== 'subtable_header',
  )
  if (traits.length === 0) return []

  const formRestricted = input.activeForm !== 'morphus'
  const rows: LiveNaturalAbilityRow[] = []
  const seenSensory = new Set<string>()

  for (const def of MORPHUS_SENSORY_ABILITY_DEFS) {
    const sources = traits.filter((t) => t.sensory?.[def.key] === true)
    if (sources.length === 0) continue
    if (seenSensory.has(def.id)) continue
    seenSensory.add(def.id)
    const primary = sources[0]!
    const description =
      (def.key === 'hawkLikeDayVision' ? visionOneOff(primary) : undefined) ??
      def.fallbackDescription
    rows.push({
      id: def.id,
      name: def.name,
      description,
      source: 'morphus',
      sourceLabel:
        sources.length === 1
          ? primary.name
          : `Morphus (${sources.map((s) => s.name).join(', ')})`,
      morphusOnly: true,
      formRestricted,
    })
  }

  for (const trait of traits) {
    const whisper = trait.sensory?.whisperHearingRangeFeet
    if (typeof whisper === 'number' && whisper > 0) {
      const id = `morphus:whisper-hearing:${trait.id}`
      rows.push({
        id,
        name: 'Whisper-range hearing',
        description: `Hear a whisper at ${whisper} ft.`,
        source: 'morphus',
        sourceLabel: trait.name,
        morphusOnly: true,
        formRestricted,
      })
    }

    const peripheral = trait.sensory?.peripheralVisionDegrees
    if (typeof peripheral === 'number' && peripheral > 0) {
      rows.push({
        id: `morphus:peripheral:${trait.id}`,
        name: 'Peripheral vision',
        description: `${peripheral}° arc.`,
        source: 'morphus',
        sourceLabel: trait.name,
        morphusOnly: true,
        formRestricted,
      })
    }

    const scent = trait.sensory?.scentTracking
    if (scent && scent.enabled !== false && scent.baseSuccessPercent != null) {
      const level = Math.max(1, Math.floor(input.characterLevel))
      const perLvl = scent.perLevelIncrement ?? 0
      const resolved = Math.min(
        98,
        scent.baseSuccessPercent + Math.max(0, level - 1) * perLvl,
      )
      rows.push({
        id: `morphus:scent:${trait.id}`,
        name: 'Scent tracking',
        description: `${resolved}% at level ${level} (base ${scent.baseSuccessPercent}% + ${perLvl}%/level).`,
        source: 'morphus',
        sourceLabel: trait.name,
        morphusOnly: true,
        formRestricted,
      })
    }

    for (const [awIndex, aw] of (trait.atWillAbilities ?? []).entries()) {
      if (aw.id === 'mirror_walk') continue
      rows.push({
        id: `morphus:at-will:${trait.id}:${aw.id}:${awIndex}`,
        name: aw.label,
        description: (aw.note ?? 'At will (Morphus).').trim(),
        source: 'morphus',
        sourceLabel: trait.name,
        morphusOnly: true,
        formRestricted,
      })
    }
  }

  return rows
}

export function listLiveSheetNaturalAbilities(input: {
  race: Race | undefined
  characterLevel: number
  activeForm?: ActiveForm
  morphusTraits?: readonly MorphusCharacteristic[]
}): LiveNaturalAbilityRow[] {
  const rows: LiveNaturalAbilityRow[] = []
  const activeForm = input.activeForm ?? 'primary'
  const morphusTraits = input.morphusTraits ?? []

  for (const [index, ability] of (input.race?.classAbilities ?? []).entries()) {
    if (!isLiveSheetRaceNaturalAbility(ability)) continue
    rows.push(
      enrichRaceNaturalAbilityRow({
        ability,
        race: input.race!,
        activeForm,
        characterLevel: input.characterLevel,
        index,
        morphusTraits,
      }),
    )
  }

  rows.push(
    ...listLiveSheetMorphusNaturalAbilities({
      morphusTraits,
      activeForm,
      characterLevel: input.characterLevel,
    }),
  )

  return rows
}

export function listLiveSheetOccAbilities(input: {
  occ: PalladiumOcc | undefined
  characterLevel: number
}): LiveNaturalAbilityRow[] {
  if (!input.occ) return []
  const rows: LiveNaturalAbilityRow[] = []
  const occName = input.occ.name?.trim() || 'O.C.C.'
  for (const [index, ability] of (input.occ.classAbilities ?? []).entries()) {
    if (!isLiveSheetOccAbility(ability, input.occ)) continue
    rows.push({
      id: `occ:${index}:${ability.name}`,
      name: ability.name,
      description: ability.description.trim(),
      source: 'occ',
      sourceLabel: occName,
      percentileLine: percentileLine(ability, input.characterLevel),
    })
  }
  return rows
}

/**
 * Shadow R.C.C. O.C.C. class abilities projected onto Natural (Joe: RCC ≈ Natural).
 * OCC tab stays O.C.C.-only for character-composition builds.
 */
export function listLiveSheetRccAbilitiesAsNatural(input: {
  race: Race | undefined
  occ: PalladiumOcc | undefined
  characterLevel: number
}): LiveNaturalAbilityRow[] {
  if (!isRccRace(input.race) || !input.occ) return []
  const label = input.race?.name?.trim() || 'R.C.C.'
  return listLiveSheetOccAbilities({
    occ: input.occ,
    characterLevel: input.characterLevel,
  }).map((row) => ({
    ...row,
    id: row.id.replace(/^occ:/, 'rcc:'),
    source: 'race' as const,
    sourceLabel: label,
  }))
}

/**
 * Whether a category applies to this build even when the list is empty.
 * Possessed rows always show; hide only when not possessed and not available.
 */
export function isLiveSheetAbilityCategoryAvailable(input: {
  categoryId: LiveSheetAbilityCategoryId
  race: Race | undefined
  occ: PalladiumOcc | undefined
  morphusTraits?: readonly MorphusCharacteristic[]
  abilityBudget?: LiveSheetAbilityBudgetHint | null
}): boolean {
  const budget = input.abilityBudget
  switch (input.categoryId) {
    case 'natural':
      return (
        Boolean(input.race) ||
        (input.morphusTraits?.length ?? 0) > 0 ||
        (isRccRace(input.race) && Boolean(input.occ))
      )
    case 'occ':
      return Boolean(input.occ) && !isRccRace(input.race)
    case 'magic':
      return (budget?.spellSlots ?? 0) > 0 || Boolean(input.occ?.ppeEngine)
    case 'psionics':
      return (budget?.psionicSlots ?? 0) > 0 || Boolean(input.occ?.ispEngine)
    case 'talents':
      return (budget?.talentSlots ?? 0) > 0
    default:
      return false
  }
}

function sectionHasRows(section: LiveSheetAbilitySection): boolean {
  return (
    (section.naturalRows?.length ?? 0) > 0 ||
    (section.catalogRows?.length ?? 0) > 0
  )
}

function compareAbilityName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function sortLiveNaturalAbilityRows(
  rows: readonly LiveNaturalAbilityRow[],
): LiveNaturalAbilityRow[] {
  return [...rows].sort((a, b) => compareAbilityName(a.name, b.name))
}

export function sortLiveCatalogAbilityRows(
  rows: readonly LiveCatalogAbilityRow[],
): LiveCatalogAbilityRow[] {
  return [...rows].sort((a, b) => compareAbilityName(a.name, b.name))
}

function magicLevelTypeKey(level: number): string {
  return `level:${level}`
}

function magicLevelTypeLabel(level: number): string {
  return `Level ${level}`
}

function talentTierTypeLabel(tier: string): string {
  if (tier === 'elite') return 'Elite'
  if (tier === 'common') return 'Common'
  return tier
}

/**
 * Type-filter options present on this section’s rows (Skills-style Radical Visibility:
 * options come from owned rows, not from the post-search subset). Natural/OCC return [].
 */
export function listLiveSheetAbilityTypeFilterOptions(
  section: LiveSheetAbilitySection,
  genreId: string,
): readonly LiveSheetAbilityTypeFilterOption[] {
  if (section.id === 'natural' || section.id === 'occ') return []

  const seen = new Set<string>()
  const options: LiveSheetAbilityTypeFilterOption[] = [
    { value: LIVE_ABILITY_FILTER_ALL_TYPES, label: 'All types' },
  ]

  const push = (value: string, label: string) => {
    if (seen.has(value)) return
    seen.add(value)
    options.push({ value, label })
  }

  for (const row of section.catalogRows ?? []) {
    for (const key of row.typeFilterKeys ?? []) {
      if (section.id === 'magic' && key.startsWith('level:')) {
        const level = Number(key.slice('level:'.length))
        if (Number.isFinite(level)) push(key, magicLevelTypeLabel(level))
        continue
      }
      if (section.id === 'psionics') {
        push(key, psionicCategoryFilterLabel(genreId, key))
        continue
      }
      if (section.id === 'talents') {
        push(key, talentTierTypeLabel(key))
      }
    }
  }

  if (section.id === 'magic') {
    const levels = options
      .filter((o) => o.value.startsWith('level:'))
      .sort(
        (a, b) =>
          Number(a.value.slice('level:'.length)) -
          Number(b.value.slice('level:'.length)),
      )
    return [
      options[0]!,
      ...levels,
      ...options.filter(
        (o) => o.value !== LIVE_ABILITY_FILTER_ALL_TYPES && !o.value.startsWith('level:'),
      ),
    ]
  }

  if (section.id === 'talents') {
    const ordered = ['common', 'elite']
    const rest = options.filter(
      (o) =>
        o.value !== LIVE_ABILITY_FILTER_ALL_TYPES && !ordered.includes(o.value),
    )
    return [
      options[0]!,
      ...ordered
        .filter((id) => seen.has(id))
        .map((id) => ({ value: id, label: talentTierTypeLabel(id) })),
      ...rest,
    ]
  }

  // Only All + no owned type keys → no filter UI.
  return options.length <= 1 ? [] : options
}

/**
 * Filter one ability section by type key and/or name query (AND when both set).
 * Empty filter = unchanged section. Type filter applies to catalog rows only.
 */
export function filterLiveSheetAbilitySection(
  section: LiveSheetAbilitySection,
  filter: LiveSheetAbilityListFilter = {},
): LiveSheetAbilitySection {
  const typeKey = filter.typeKey?.trim() ?? LIVE_ABILITY_FILTER_ALL_TYPES
  const query = filter.nameQuery?.trim().toLowerCase() ?? ''

  const naturalRows = (section.naturalRows ?? []).filter((row) => {
    if (!query) return true
    return row.name.toLowerCase().includes(query)
  })
  const catalogRows = (section.catalogRows ?? []).filter((row) => {
    if (
      typeKey !== LIVE_ABILITY_FILTER_ALL_TYPES &&
      !(row.typeFilterKeys ?? []).includes(typeKey)
    ) {
      return false
    }
    if (query && !row.name.toLowerCase().includes(query)) return false
    return true
  })

  return {
    ...section,
    naturalRows: section.naturalRows ? naturalRows : undefined,
    catalogRows: section.catalogRows ? catalogRows : undefined,
  }
}

export function listLiveSheetCatalogAbilities(input: {
  selectedAbilityIds: readonly string[]
  activeForm: ActiveForm
  genreId: string
}): Record<
  Exclude<LiveSheetAbilityCategoryId, 'natural' | 'occ'>,
  LiveCatalogAbilityRow[]
> {
  const out: Record<
    Exclude<LiveSheetAbilityCategoryId, 'natural' | 'occ'>,
    LiveCatalogAbilityRow[]
  > = {
    magic: [],
    psionics: [],
    talents: [],
  }

  const genreLower = input.genreId.toLowerCase()

  for (const id of input.selectedAbilityIds) {
    const ability = getAbilityById(id)
    const feature = getFeatureById(id)
    if (!ability) {
      out.magic.push({
        id,
        name: id,
        description: 'Unknown ability id on this record.',
      })
      continue
    }
    const section = ABILITY_CATEGORY_TO_SECTION[ability.category]
    const description =
      input.activeForm === 'morphus' && ability.descriptionMorphus?.trim()
        ? ability.descriptionMorphus.trim()
        : ability.description.trim()

    const metaParts: string[] = []
    const typeFilterKeys: string[] = []
    if (ability.category === 'Spell') {
      const spell = getPalladiumMagicSpellById(id)
      if (spell) metaParts.push(formatMagicPpeCost(spell))
      else if (ability.baseCost > 0) metaParts.push(`${ability.baseCost} P.P.E.`)
      const level =
        ability.spellLevel ??
        (typeof spell?.level === 'number' ? spell.level : undefined)
      if (level != null) {
        metaParts.push(`Level ${level}`)
        typeFilterKeys.push(magicLevelTypeKey(level))
      }
    } else if (ability.category === 'Psionic') {
      const psi = getPalladiumPsionicById(id)
      if (psi) metaParts.push(formatPsionicIspCost(psi, input.genreId))
      else if (ability.baseCost > 0) metaParts.push(`${ability.baseCost} I.S.P.`)
      if (psi) {
        for (const placement of psi.genrePlacements) {
          if (placement.genreId.toLowerCase() !== genreLower) continue
          if (!typeFilterKeys.includes(placement.category)) {
            typeFilterKeys.push(placement.category)
          }
        }
      }
    } else if (ability.category === 'Talent') {
      const talent = getPalladiumTalentById(id)
      if (talent) {
        typeFilterKeys.push(talentCatalogTier(talent))
      } else {
        typeFilterKeys.push('common')
      }
      if (ability.activationCost) metaParts.push(ability.activationCost)
      else if (ability.ppeCost != null) {
        metaParts.push(
          typeof ability.ppeCost === 'number'
            ? `${ability.ppeCost} P.P.E.`
            : String(ability.ppeCost),
        )
      }
    } else if (ability.activationCost) {
      metaParts.push(ability.activationCost)
    } else if (ability.ppeCost != null) {
      metaParts.push(
        typeof ability.ppeCost === 'number'
          ? `${ability.ppeCost} P.P.E.`
          : String(ability.ppeCost),
      )
    }

    const formOk = feature ? featureAppliesToForm(feature, input.activeForm) : true
    out[section].push({
      id,
      name: ability.name,
      description,
      metaLine: metaParts.filter(Boolean).join(' · ') || undefined,
      morphusOnly: ability.morphusOnly === true,
      formRestricted: !formOk,
      typeFilterKeys: typeFilterKeys.length > 0 ? typeFilterKeys : undefined,
    })
  }

  return {
    magic: sortLiveCatalogAbilityRows(out.magic),
    psionics: sortLiveCatalogAbilityRows(out.psionics),
    talents: sortLiveCatalogAbilityRows(out.talents),
  }
}

/**
 * Live sheet Abilities category sections (Unified Path).
 * - `emptyPolicy: 'omit'` (default) — strip Abilities: empty categories hidden.
 * - `emptyPolicy: 'show-if-available'` — Combat Abilities: empty available tabs still show.
 * R.C.C. shadow O.C.C. gameplay abilities land under Natural; OCC tab is O.C.C.-only.
 */
export function buildLiveSheetAbilitySections(input: {
  race: Race | undefined
  occ: PalladiumOcc | undefined
  characterLevel: number
  selectedAbilityIds: readonly string[]
  activeForm: ActiveForm
  genreId: string
  morphusTraits?: readonly MorphusCharacteristic[]
  abilityBudget?: LiveSheetAbilityBudgetHint | null
  emptyPolicy?: LiveSheetAbilityEmptyPolicy
}): LiveSheetAbilitySection[] {
  const emptyPolicy = input.emptyPolicy ?? 'omit'
  const rcc = isRccRace(input.race)
  const raceNaturalRows = listLiveSheetNaturalAbilities({
    race: input.race,
    characterLevel: input.characterLevel,
    activeForm: input.activeForm,
    morphusTraits: input.morphusTraits,
  })
  const rccNaturalRows = listLiveSheetRccAbilitiesAsNatural({
    race: input.race,
    occ: input.occ,
    characterLevel: input.characterLevel,
  })
  const naturalRows = sortLiveNaturalAbilityRows([
    ...raceNaturalRows,
    ...rccNaturalRows,
  ])
  const occRows = rcc
    ? []
    : sortLiveNaturalAbilityRows(
        listLiveSheetOccAbilities({
          occ: input.occ,
          characterLevel: input.characterLevel,
        }),
      )
  const catalog = listLiveSheetCatalogAbilities({
    selectedAbilityIds: input.selectedAbilityIds,
    activeForm: input.activeForm,
    genreId: input.genreId,
  })

  const availabilityInput = {
    race: input.race,
    occ: input.occ,
    morphusTraits: input.morphusTraits,
    abilityBudget: input.abilityBudget,
  }

  const sections: LiveSheetAbilitySection[] = []
  for (const id of CATEGORY_ORDER) {
    let section: LiveSheetAbilitySection
    if (id === 'natural') {
      section = {
        id,
        label: CATEGORY_LABELS[id],
        naturalRows,
      }
    } else if (id === 'occ') {
      section = {
        id,
        label: CATEGORY_LABELS[id],
        naturalRows: occRows,
      }
    } else {
      section = {
        id,
        label: CATEGORY_LABELS[id],
        catalogRows: catalog[id],
      }
    }

    const possessed = sectionHasRows(section)
    if (possessed) {
      sections.push(section)
      continue
    }
    if (
      emptyPolicy === 'show-if-available' &&
      isLiveSheetAbilityCategoryAvailable({
        categoryId: id,
        ...availabilityInput,
      })
    ) {
      sections.push(section)
    }
  }
  return sections
}
