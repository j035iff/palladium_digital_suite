import type { EngineSkillDef } from '../data/skillLibrary'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { getWeaponProficiencyCatalogEntryById } from '../data/library/weaponProficienciesCatalogLoader'

export type SkillSubPercentLine = {
  name: string
  basePercent: number
  perLevel: number
}

export type SkillCatalogDisplayDetails = {
  isWeaponProficiency: boolean
  physicalBonusSummary: string | null
  weaponBonusSummary: string | null
  subPercentLines: readonly SkillSubPercentLine[]
  /** Sub-task / sub-skill names only (no %), for creation library preview. */
  subSkillNames: readonly string[]
  /** Skills granted via conditionalRelatedSkills when the character lacks them. */
  grantedSkillNames: readonly string[]
  /** Show the primary Base % · +%/level → total line (not sub-tasks). */
  showMainPercentLine: boolean
}

const ATTR_KEYS = ['ps', 'pp', 'pe', 'spd', 'sdc'] as const

const ATTR_LABELS: Record<(typeof ATTR_KEYS)[number], string> = {
  ps: 'PS',
  pp: 'PP',
  pe: 'PE',
  spd: 'Spd',
  sdc: 'SDC',
}

const COMBAT_KEYS = [
  'strike',
  'parry',
  'dodge',
  'rollWithImpact',
  'pullPunch',
  'apm',
  'strikeWhenThrown',
] as const

const COMBAT_LABELS: Record<(typeof COMBAT_KEYS)[number], string> = {
  strike: 'strike',
  parry: 'parry',
  dodge: 'dodge',
  rollWithImpact: 'roll w/punch/fall',
  pullPunch: 'pull punch',
  apm: 'APM',
  strikeWhenThrown: 'throw',
}

function formatSignedBonus(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw > 0 ? `+${raw}` : String(raw)
  }
  if (typeof raw === 'string' && raw.trim()) {
    const t = raw.trim()
    return t.startsWith('+') || t.startsWith('-') ? t : `+${t}`
  }
  return null
}

export function formatPhysicalSkillBonusSummary(
  bonuses: Record<string, unknown> | undefined,
): string | null {
  if (!bonuses || typeof bonuses !== 'object') return null

  const parts: string[] = []

  const parry = bonuses.parry
  const dodge = bonuses.dodge
  const parryFmt = formatSignedBonus(parry)
  const dodgeFmt = formatSignedBonus(dodge)
  if (
    parryFmt &&
    dodgeFmt &&
    parry === dodge &&
    typeof parry === typeof dodge
  ) {
    parts.push(`${parryFmt} parry/dodge`)
  } else {
    if (parryFmt) parts.push(`${parryFmt} ${COMBAT_LABELS.parry}`)
    if (dodgeFmt) parts.push(`${dodgeFmt} ${COMBAT_LABELS.dodge}`)
  }

  for (const key of COMBAT_KEYS) {
    if (key === 'parry' || key === 'dodge') continue
    const fmt = formatSignedBonus(bonuses[key])
    if (fmt) parts.push(`${fmt} ${COMBAT_LABELS[key]}`)
  }

  for (const key of ATTR_KEYS) {
    const fmt = formatSignedBonus(bonuses[key])
    if (fmt) parts.push(`${fmt} ${ATTR_LABELS[key]}`)
  }

  return parts.length > 0 ? parts.join(', ') : null
}

function listSubPercentLines(
  entry: Record<string, unknown>,
): SkillSubPercentLine[] {
  const lines: SkillSubPercentLine[] = []

  const subTasks = entry.subTasks as
    | Array<{ name?: string; basePercent?: number; percentPerLevel?: number }>
    | undefined
  for (const task of subTasks ?? []) {
    if (typeof task.basePercent !== 'number') continue
    lines.push({
      name: task.name ?? 'Sub-task',
      basePercent: task.basePercent,
      perLevel:
        typeof task.percentPerLevel === 'number' ? task.percentPerLevel : 5,
    })
  }

  const subSkills = entry.subSkills as
    | Array<{ name?: string; basePercent?: number; percentPerLevel?: number }>
    | undefined
  for (const sub of subSkills ?? []) {
    if (typeof sub.basePercent !== 'number') continue
    lines.push({
      name: sub.name ?? 'Sub-skill',
      basePercent: sub.basePercent,
      perLevel:
        typeof sub.percentPerLevel === 'number' ? sub.percentPerLevel : 5,
    })
  }

  return lines
}

export function listCatalogSubSkillNames(
  entry: Record<string, unknown> | undefined,
): string[] {
  if (!entry) return []
  const names: string[] = []

  const subTasks = entry.subTasks as Array<{ name?: string }> | undefined
  for (const task of subTasks ?? []) {
    const name = task.name?.trim()
    if (name) names.push(name)
  }

  const subSkills = entry.subSkills as Array<{ name?: string }> | undefined
  for (const sub of subSkills ?? []) {
    const name = sub.name?.trim()
    if (name) names.push(name)
  }

  return names
}

export function listCatalogConditionalGrantedSkillNames(
  entry: Record<string, unknown> | undefined,
): string[] {
  if (!entry) return []
  const grants = entry.conditionalRelatedSkills as
    | Array<{ skillId?: string }>
    | undefined
  return (grants ?? [])
    .map((grant) => getPalladiumSkillCatalogEntryById(grant.skillId ?? '')?.name)
    .filter((name): name is string => !!name)
}

/** Stat bonuses + sub-skill names for the creation skill library (no % lines). */
export function resolveCreationLibrarySkillPreview(
  def: EngineSkillDef,
): Pick<
  SkillCatalogDisplayDetails,
  'physicalBonusSummary' | 'subSkillNames' | 'grantedSkillNames'
> {
  const entry = getPalladiumSkillCatalogEntryById(def.id) as
    | Record<string, unknown>
    | undefined
  const physicalRaw = entry?.physicalSkillBonuses as
    | Record<string, unknown>
    | undefined

  return {
    physicalBonusSummary: formatPhysicalSkillBonusSummary(physicalRaw),
    subSkillNames: listCatalogSubSkillNames(entry),
    grantedSkillNames: listCatalogConditionalGrantedSkillNames(entry),
  }
}

function formatWpBonusesAtLevel(
  wp: {
    levelTiers?: readonly Record<string, unknown>[]
  },
  characterLevel: number,
): string | null {
  const parts: string[] = []
  const totals: Record<string, number> = {}

  for (const tier of wp.levelTiers ?? []) {
    const at = tier.atCharacterLevel
    if (typeof at !== 'number' || at > characterLevel) continue
    for (const key of COMBAT_KEYS) {
      const val = tier[key]
      if (typeof val === 'number' && Number.isFinite(val)) {
        totals[key] = (totals[key] ?? 0) + val
      }
    }
  }

  const parry = totals.parry
  const dodge = totals.dodge
  if (parry && dodge && parry === dodge) {
    parts.push(`+${parry} parry/dodge`)
  } else {
    if (parry) parts.push(`+${parry} ${COMBAT_LABELS.parry}`)
    if (dodge) parts.push(`+${dodge} ${COMBAT_LABELS.dodge}`)
  }

  for (const key of COMBAT_KEYS) {
    if (key === 'parry' || key === 'dodge') continue
    const val = totals[key]
    if (val) parts.push(`+${val} ${COMBAT_LABELS[key]}`)
  }

  return parts.length > 0 ? parts.join(', ') : null
}

export function isWeaponProficiencySkill(def: EngineSkillDef): boolean {
  return def.category === 'Weapon' || def.id.startsWith('wp_')
}

export function resolveSkillCatalogDisplayDetails(
  def: EngineSkillDef,
  characterLevel: number,
): SkillCatalogDisplayDetails {
  const isWp = isWeaponProficiencySkill(def)

  if (isWp) {
    const wp = getWeaponProficiencyCatalogEntryById(def.id)
    return {
      isWeaponProficiency: true,
      physicalBonusSummary: null,
      weaponBonusSummary: wp
        ? formatWpBonusesAtLevel(wp, characterLevel)
        : null,
      subPercentLines: [],
      subSkillNames: [],
      grantedSkillNames: [],
      showMainPercentLine: false,
    }
  }

  const entry = getPalladiumSkillCatalogEntryById(def.id) as
    | Record<string, unknown>
    | undefined
  const physicalRaw = entry?.physicalSkillBonuses as
    | Record<string, unknown>
    | undefined
  const subPercentLines = entry ? listSubPercentLines(entry) : []
  const physicalBonusSummary = formatPhysicalSkillBonusSummary(physicalRaw)

  return {
    isWeaponProficiency: false,
    physicalBonusSummary,
    weaponBonusSummary: null,
    subPercentLines,
    subSkillNames: listCatalogSubSkillNames(entry),
    grantedSkillNames: listCatalogConditionalGrantedSkillNames(entry),
    showMainPercentLine: def.basePercent > 0,
  }
}
