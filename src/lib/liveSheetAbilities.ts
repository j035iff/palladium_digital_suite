import { getAbilityById, type AbilityCategory } from '../data/abilityLibrary'
import {
  formatMagicPpeCost,
  formatPsionicIspCost,
  getFeatureById,
  getPalladiumMagicSpellById,
  getPalladiumPsionicById,
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

export type LiveSheetAbilityCategoryId =
  | 'natural'
  | 'occ'
  | 'magic'
  | 'psionics'
  | 'talents'

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
}

export type LiveSheetAbilitySection = {
  id: LiveSheetAbilityCategoryId
  label: string
  /** Race / Morphus / O.C.C. list rows (Natural + O.C.C. tabs). */
  naturalRows?: LiveNaturalAbilityRow[]
  catalogRows?: LiveCatalogAbilityRow[]
}

const CATEGORY_ORDER: readonly LiveSheetAbilityCategoryId[] = [
  'natural',
  'occ',
  'magic',
  'psionics',
  'talents',
]

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
    if (ability.category === 'Spell') {
      const spell = getPalladiumMagicSpellById(id)
      if (spell) metaParts.push(formatMagicPpeCost(spell))
      else if (ability.baseCost > 0) metaParts.push(`${ability.baseCost} P.P.E.`)
      if (ability.spellLevel != null) metaParts.push(`Level ${ability.spellLevel}`)
    } else if (ability.category === 'Psionic') {
      const psi = getPalladiumPsionicById(id)
      if (psi) metaParts.push(formatPsionicIspCost(psi, input.genreId))
      else if (ability.baseCost > 0) metaParts.push(`${ability.baseCost} I.S.P.`)
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
    })
  }

  return out
}

/**
 * Live sheet Abilities tab sections — empty categories are omitted.
 */
export function buildLiveSheetAbilitySections(input: {
  race: Race | undefined
  occ: PalladiumOcc | undefined
  characterLevel: number
  selectedAbilityIds: readonly string[]
  activeForm: ActiveForm
  genreId: string
  morphusTraits?: readonly MorphusCharacteristic[]
}): LiveSheetAbilitySection[] {
  const naturalRows = listLiveSheetNaturalAbilities({
    race: input.race,
    characterLevel: input.characterLevel,
    activeForm: input.activeForm,
    morphusTraits: input.morphusTraits,
  })
  const occRows = listLiveSheetOccAbilities({
    occ: input.occ,
    characterLevel: input.characterLevel,
  })
  const catalog = listLiveSheetCatalogAbilities({
    selectedAbilityIds: input.selectedAbilityIds,
    activeForm: input.activeForm,
    genreId: input.genreId,
  })

  const sections: LiveSheetAbilitySection[] = []
  for (const id of CATEGORY_ORDER) {
    if (id === 'natural') {
      if (naturalRows.length === 0) continue
      sections.push({
        id,
        label: CATEGORY_LABELS[id],
        naturalRows,
      })
      continue
    }
    if (id === 'occ') {
      if (occRows.length === 0) continue
      sections.push({
        id,
        label: CATEGORY_LABELS[id],
        naturalRows: occRows,
      })
      continue
    }
    const catalogRows = catalog[id]
    if (catalogRows.length === 0) continue
    sections.push({
      id,
      label: CATEGORY_LABELS[id],
      catalogRows,
    })
  }
  return sections
}
