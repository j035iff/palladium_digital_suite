import { getSkillById } from '../data/skillLibrary'
import { getAbilityById } from '../data/abilityLibrary'
import { getWeaponProficiencyCatalogEntryById } from '../data/library/weaponProficienciesCatalogLoader'
import { getPalladiumTalentById } from '../data/library/talentCatalogLoader'
import type { OccClassAbility, PalladiumOcc, Race } from '../types'
import {
  creationHandToHandTierFromSkillId,
  creationHandToHandTierLabel,
  occStartingHandToHandTier,
} from './creationHandToHandChoice'
import {
  occCreationAbilityBudget,
  occCreationPsionicRestrictions,
  occCreationSpellRestrictions,
  occRelatedSkillSlotBudget,
  occSecondarySkillSlots,
  occStartingSpellLevelCap,
} from './occCreationDerivation'
import {
  isOccCoreSkillChoiceVoucher,
  isOccCoreSkillGrant,
  occGrantsDefaultHandToHand,
  resolveEffectivePalladiumOcc,
} from './occComposition'
import { formatOccCoreVoucherCategoryScope } from './occCoreSkillVouchers'
import { occPsychicGateBypassed } from './occCatalogEngine'
import { formatOccCategoryRuleHeader } from './occCategoryRuleDisplay'
import { racePassiveModifiers } from './raceEngine'
import { formatPassiveAttributeBonuses } from './sheetBonuses'
import { formatPsionicGlobalRuleSummaryLines } from './psionicGlobalRules'
import { isDiceNotation } from './diceNotationBounds'
import {
  formatSupernaturalSelectionModeLabel,
  occIspCreationSelectionPlan,
  occIspPerLevelSelection,
} from './occSupernaturalSelection'
import type { OccSupernaturalCreationSelectionStep, OccSupernaturalPerLevelSelection } from '../types'

export type ConfiguratorPackageStructuredItem =
  | { kind: 'lane'; label: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'choice'; detail: string }
  | { kind: 'text'; text: string }

export type ConfiguratorPackageItem = string | ConfiguratorPackageStructuredItem

export function packageItemText(item: ConfiguratorPackageItem): string {
  if (typeof item === 'string') return item
  switch (item.kind) {
    case 'lane':
      return item.label
    case 'subheading':
      return item.text
    case 'choice':
      return `Choice of: ${item.detail}`
    case 'text':
      return item.text
    default:
      return ''
  }
}

export type ConfiguratorPackageSection = {
  id: string
  title: string
  items: readonly ConfiguratorPackageItem[]
}



export type ConfiguratorPackageSummary = {
  sections: ConfiguratorPackageSection[]
}



/** Canonical O.C.C. detail section order (after the O.C.C. heading). */
export const OCC_PACKAGE_SECTION_ORDER = [
  'occ-attributes-reqs',
  'occ-package-notes',
  'occ-special-abilities',
  'occ-supernatural',
  'occ-vitals',
  'occ-non-combat',
  'occ-hth',
  'occ-combat',
  'occ-core-skills',
  'occ-wp',
  'occ-skill-allowances',
  'occ-gear',
] as const

const VITAL_COMBAT_KEYS = new Set(['sdc'])
const VITAL_REMAINING_KEYS = new Set(['hp', 'mdc'])



/** Canonical race detail section order (after the race heading). */
export const RACE_PACKAGE_SECTION_ORDER = [
  'race-attributes-reqs',
  'race-special-abilities',
  'race-supernatural',
  'race-vitals',
  'race-bonuses',
  'race-innate-skills',
  'race-rcc',
] as const



const ATTRIBUTE_LABELS: Record<string, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}



const COMBAT_LABELS: Record<string, string> = {
  initiative: 'Initiative',
  perception: 'Perception',
  strike: 'Strike',
  parry: 'Parry',
  dodge: 'Dodge',
  rollWithPunch: 'Roll w/ punch',
  pullPunch: 'Pull punch',
  damage: 'Damage',
  attacksPerMelee: 'Attacks/melee',
}



const SAVE_LABELS: Record<string, string> = {
  save_psionics: 'Save vs psionics',
  save_mind_control: 'Save vs mind control',
  save_horror: 'Save vs horror factor',
  save_horror_factor: 'Save vs horror factor',
  save_magic: 'Save vs magic',
  save_possession: 'Save vs possession',
  save_poison: 'Save vs poison',
  save_insanity: 'Save vs insanity',
  save_disease: 'Save vs disease',
}



const VITAL_LABELS: Record<string, string> = {
  hp: 'H.P.',
  sdc: 'S.D.C.',
  ppe: 'P.P.E.',
  isp: 'I.S.P.',
  mdc: 'M.D.C.',
}



/** Combat keys surfaced under non-combat bonuses (per package standard). */
const NON_COMBAT_COMBAT_KEYS = new Set(['perception'])



function formatClassAbilityLines(abilities: readonly OccClassAbility[] | undefined): string[] {
  if (!abilities?.length) return []
  return abilities.map((ability) =>
    ability.description.trim()
      ? `${ability.name} — ${ability.description.trim()}`
      : ability.name,
  )
}

/** Skill-program notes and class-type boilerplate — not O.C.C.-unique abilities for package summary. */
const OCC_SKILL_PROGRAM_ABILITY_PATTERN =
  /background skill|pre-transformation skill|limited skill memory|facade hand to hand|civilian weapon|native literacy|^literacy$|related skill|secondary skill|weapon proficienc|hand to hand:|hand to hand must|core skill|skill pick|skill program|skill package|select literacy/i

const OCC_STAT_BUNDLE_ABILITY_PATTERN = /^physical bonuses$|^combat bonuses$/i

const OCC_PSIONIC_CLASS_BOILERPLATE_PATTERN =
  /^master psionic$|^major psionic$|^minor psionic$/i

function isSpecializedOccClassAbility(
  ability: OccClassAbility,
  occ: PalladiumOcc,
): boolean {
  const name = ability.name.trim()
  const haystack = `${name} ${ability.description}`.toLowerCase()

  if (OCC_STAT_BUNDLE_ABILITY_PATTERN.test(name)) return false
  if (OCC_SKILL_PROGRAM_ABILITY_PATTERN.test(haystack)) return false
  if (occ.occType === 'psychic' && OCC_PSIONIC_CLASS_BOILERPLATE_PATTERN.test(name.toLowerCase())) {
    return false
  }
  if (/^initial psionic grants$/i.test(name)) return false

  return true
}

function formatSpecializedOccClassAbilityLines(
  occ: PalladiumOcc,
  abilities: readonly OccClassAbility[] | undefined,
): string[] {
  const specialized = (abilities ?? []).filter((ability) =>
    isSpecializedOccClassAbility(ability, occ),
  )
  return formatClassAbilityLines(specialized)
}

function formatRaceSdcDisplayLine(race: Race): string {
  const sdc = race.vitals.sdc
  if (sdc == null) return 'S.D.C.: Per OCC and Skills'
  if (typeof sdc === 'number' || typeof sdc === 'string') return `S.D.C.: ${sdc}`
  return 'S.D.C.: Per OCC and Skills'
}

function buildRaceVitalItems(race: Race): string[] {
  const items: string[] = []
  if (race.vitals.hpFormula) {
    items.push(`H.P.: ${race.vitals.hpFormula}`)
  }
  items.push(formatRaceSdcDisplayLine(race))
  return items
}

const RACE_ATTRIBUTE_MODIFIER_KEYS = new Set([
  'iq',
  'me',
  'ma',
  'ps',
  'pp',
  'pe',
  'pb',
  'spd',
])

const RACE_BONUS_LABELS: Record<string, string> = {
  ...COMBAT_LABELS,
  ...SAVE_LABELS,
  horrorFactor: 'Horror factor',
  rollWithImpact: 'Roll w/ impact',
  sdc: 'S.D.C.',
}

function buildRaceBonusItems(race: Race): string[] {
  const items: string[] = []
  const modifiers = race.innateBonuses?.modifiers ?? {}

  const attrLine = formatPassiveAttributeBonuses(racePassiveModifiers(race))
  if (attrLine) items.push(attrLine)

  const { combat, nonCombat } = splitInnateCombatModifiers(modifiers)
  items.push(...formatModifierLines({ ...nonCombat, ...combat }, COMBAT_LABELS))

  const remainder: Record<string, number> = {}
  for (const [key, value] of Object.entries(modifiers)) {
    if (typeof value !== 'number' || value === 0) continue
    if (RACE_ATTRIBUTE_MODIFIER_KEYS.has(key)) continue
    if (COMBAT_LABELS[key] || NON_COMBAT_COMBAT_KEYS.has(key)) continue
    remainder[key] = value
  }
  items.push(...formatModifierLines(remainder, RACE_BONUS_LABELS))

  return items
}



function skillDisplayName(skillId: string): string {
  return (
    getSkillById(skillId)?.name ??
    getWeaponProficiencyCatalogEntryById(skillId)?.name ??
    skillId.replace(/^skill_/, '').replace(/_/g, ' ')
  )
}

function supernaturalAbilityDisplayName(abilityId: string): string {
  return (
    getAbilityById(abilityId)?.name ??
    abilityId.replace(/^(psionic_|spell_|talent_)/, '').replace(/_/g, ' ')
  )
}

function appendGrantedSupernaturalAbilities(
  lines: ConfiguratorPackageItem[],
  grantedIds: readonly string[] | undefined,
): void {
  for (const abilityId of grantedIds ?? []) {
    lines.push({ kind: 'text', text: supernaturalAbilityDisplayName(abilityId) })
  }
}

function formatPackagePerLevelSelectionLine(
  rule: OccSupernaturalPerLevelSelection | undefined,
): string | undefined {
  if (!rule) return undefined
  const modeLabel = formatSupernaturalSelectionModeLabel(rule.selectionMode)
  const prefix = rule.label?.trim() ?? 'Per level'
  if (
    rule.selectionMode.kind === 'pool' ||
    rule.selectionMode.kind === 'single_category'
  ) {
    return `${prefix}: ${modeLabel}`
  }
  return `${prefix}: ${rule.selectionsGained} ${modeLabel}`
}

function appendFirstLevelSupernaturalBlock(
  lines: ConfiguratorPackageItem[],
  params: {
    grantedIds: readonly string[] | undefined
    plan: readonly OccSupernaturalCreationSelectionStep[] | undefined
    pickCount: number
    fallbackChoiceDetail?: string
  },
): void {
  const granted = params.grantedIds ?? []
  const plan = params.plan ?? []
  const hasChoices = params.pickCount > 0
  if (granted.length === 0 && !hasChoices) return

  lines.push({ kind: 'subheading', text: 'Abilities at 1st Level' })
  appendGrantedSupernaturalAbilities(lines, granted)

  if (!hasChoices) return

  if (plan.length > 0) {
    for (const step of plan) {
      lines.push({
        kind: 'choice',
        detail: formatSupernaturalSelectionModeLabel(step.selectionMode),
      })
    }
    return
  }

  if (params.fallbackChoiceDetail) {
    lines.push({ kind: 'choice', detail: params.fallbackChoiceDetail })
  }
}



function formatModifierLines(
  mods: Record<string, number>,
  labels: Record<string, string>,
): string[] {
  const lines: string[] = []
  for (const [key, value] of Object.entries(mods)) {
    if (value == null || value === 0) continue
    const label = labels[key] ?? key.replace(/_/g, ' ')
    lines.push(`${label} ${value >= 0 ? '+' : ''}${value}`)
  }
  return lines
}



function formatStaticBonusLines(
  section: Record<string, number | string> | undefined,
  labels: Record<string, string>,
  excludeKeys?: ReadonlySet<string>,
): string[] {
  if (!section) return []
  const lines: string[] = []
  for (const [key, raw] of Object.entries(section)) {
    if (excludeKeys?.has(key)) continue
    if (typeof raw === 'number' && raw !== 0) {
      const label = labels[key] ?? key.replace(/_/g, ' ')
      lines.push(`${label} ${raw >= 0 ? '+' : ''}${raw}`)
    } else if (typeof raw === 'string' && raw.trim()) {
      const label = labels[key] ?? key.replace(/_/g, ' ')
      lines.push(`${label}: ${raw}`)
    }
  }
  return lines
}



function splitCombatStaticBonuses(
  combat: Record<string, number | string> | undefined,
): { combat: string[]; nonCombat: string[] } {
  if (!combat) return { combat: [], nonCombat: [] }
  const combatOnly: Record<string, number | string> = {}
  const nonCombatOnly: Record<string, number | string> = {}
  for (const [key, value] of Object.entries(combat)) {
    if (NON_COMBAT_COMBAT_KEYS.has(key)) {
      nonCombatOnly[key] = value
    } else {
      combatOnly[key] = value
    }
  }
  return {
    combat: formatStaticBonusLines(combatOnly, COMBAT_LABELS),
    nonCombat: formatStaticBonusLines(nonCombatOnly, COMBAT_LABELS),
  }
}



function splitInnateCombatModifiers(modifiers: Record<string, number> | undefined): {
  combat: Record<string, number>
  nonCombat: Record<string, number>
} {
  const combatMods: Record<string, number> = {}
  const nonCombatMods: Record<string, number> = {}
  for (const [key, value] of Object.entries(modifiers ?? {})) {
    if (typeof value !== 'number' || value === 0) continue
    if (NON_COMBAT_COMBAT_KEYS.has(key)) {
      nonCombatMods[key] = value
    } else if (COMBAT_LABELS[key]) {
      combatMods[key] = value
    }
  }
  return { combat: combatMods, nonCombat: nonCombatMods }
}



function pushSection(
  sections: ConfiguratorPackageSection[],
  id: string,
  title: string,
  items: ConfiguratorPackageItem[],
): void {
  if (items.length === 0) return
  sections.push({ id, title, items })
}



function formatAttributeRequirementLines(occ: PalladiumOcc): string[] {
  const reqs = occ.attributeRequirements
  if (!reqs) return []
  return Object.entries(reqs)
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      const label = ATTRIBUTE_LABELS[key] ?? key.toUpperCase()
      return `${label} ${value}+ required`
    })
}



function formatOccAttributeBonusLines(
  attributes: Record<string, number | string> | undefined,
): string[] {
  const lines: string[] = []
  for (const [key, raw] of Object.entries(attributes ?? {})) {
    const label = ATTRIBUTE_LABELS[key] ?? key.toUpperCase()
    if (typeof raw === 'number' && raw !== 0) {
      lines.push(`${label} ${raw >= 0 ? '+' : ''}${raw}`)
    } else if (typeof raw === 'string' && isDiceNotation(raw)) {
      lines.push(`${label} ${raw} (roll at creation)`)
    }
  }
  return lines
}



function formatRaceAttributeDiceLines(race: Race): string[] {
  return Object.entries(race.attributes).map(([key, formula]) => {
    const label = ATTRIBUTE_LABELS[key] ?? key.toUpperCase()
    return `${label} ${formula}`
  })
}



function formatVitalSubset(
  vitals: Record<string, number | string> | undefined,
  keys: ReadonlySet<string>,
): string[] {
  if (!vitals) return []
  const subset: Record<string, number | string> = {}
  for (const [key, raw] of Object.entries(vitals)) {
    if (!keys.has(key)) continue
    if (typeof raw === 'number' && raw === 0) continue
    if (typeof raw === 'string' && !raw.trim()) continue
    subset[key] = raw
  }
  return formatStaticBonusLines(subset, VITAL_LABELS)
}

function formatOccSupernaturalAbilityLines(
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
): ConfiguratorPackageItem[] {
  const lines: ConfiguratorPackageItem[] = []
  const budget = occCreationAbilityBudget(occ)
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const hasSpellPicks = budget.spellSlots > 0
  const hasMagicSchool = (occ.ppeEngine?.magicSchools?.length ?? 0) > 0
  const hasMagic = hasSpellPicks || hasMagicSchool
  const hasPsionics = Boolean(occ.ispEngine) || budget.psionicSlots > 0

  if (hasMagic) {
    lines.push({ kind: 'lane', label: 'Magic' })
    if (occ.ppeEngine) {
      lines.push({
        kind: 'text',
        text: `P.P.E.: ${occ.ppeEngine.baseFormula} (+ ${occ.ppeEngine.perLevelFormula}/level)`,
      })
    }
    for (const line of formatVitalSubset(effective.staticBonuses?.vitals, new Set(['ppe']))) {
      lines.push({ kind: 'text', text: line })
    }
    if (occ.baseStats?.ppeDice) {
      lines.push({ kind: 'text', text: `P.P.E.: ${occ.baseStats.ppeDice} (base dice)` })
    }
    appendFirstLevelSupernaturalBlock(lines, {
      grantedIds: occ.ppeEngine?.grantedAbilityIds,
      plan: occ.ppeEngine?.creationSelectionPlan,
      pickCount: budget.spellSlots,
      fallbackChoiceDetail:
        budget.spellSlots > 0
          ? `${budget.spellSlots} spell${budget.spellSlots === 1 ? '' : 's'} to select at creation`
          : undefined,
    })
    if (budget.spellSlots > 0 && !occ.ppeEngine?.creationSelectionPlan?.length) {
      lines.push({
        kind: 'text',
        text: `Spell strength cap at 1st level: ${occStartingSpellLevelCap(occ)}`,
      })
      const spellRestrictions = occCreationSpellRestrictions(occ, 1)
      if (spellRestrictions.length) {
        lines.push({
          kind: 'text',
          text: `Spell categories: ${spellRestrictions.join('; ')}`,
        })
      }
    }
  }

  if (hasPsionics) {
    lines.push({ kind: 'lane', label: 'Psionic' })
    if (occ.ispEngine) {
      lines.push({
        kind: 'text',
        text: `I.S.P.: ${occ.ispEngine.baseFormula} (+ ${occ.ispEngine.perLevelFormula}/level)`,
      })
      lines.push({
        kind: 'text',
        text: `Save class: ${occ.ispEngine.savingThrowClass}`,
      })
    }
    for (const line of formatVitalSubset(effective.staticBonuses?.vitals, new Set(['isp']))) {
      lines.push({ kind: 'text', text: line })
    }
    if (occ.baseStats?.ispDice) {
      lines.push({ kind: 'text', text: `I.S.P.: ${occ.baseStats.ispDice} (base dice)` })
    }
    appendFirstLevelSupernaturalBlock(lines, {
      grantedIds: occ.ispEngine?.grantedAbilityIds,
      plan: occIspCreationSelectionPlan(occ),
      pickCount: budget.psionicSlots,
      fallbackChoiceDetail:
        budget.psionicSlots > 0
          ? `${budget.psionicSlots} psionic power${budget.psionicSlots === 1 ? '' : 's'} to select at creation`
          : undefined,
    })
    if (budget.psionicSlots > 0 && !occIspCreationSelectionPlan(occ)?.length) {
      const psionicRestrictions = occCreationPsionicRestrictions(occ, 1)
      if (psionicRestrictions.length) {
        lines.push({
          kind: 'text',
          text: `Psionic categories: ${psionicRestrictions.join('; ')}`,
        })
      }
    }
    const perLevel = formatPackagePerLevelSelectionLine(occIspPerLevelSelection(occ))
    if (perLevel) lines.push({ kind: 'text', text: perLevel })
    for (const line of formatPsionicGlobalRuleSummaryLines(occ)) {
      lines.push({ kind: 'text', text: line })
    }
  }

  if (budget.talentSlots > 0) {
    lines.push({ kind: 'lane', label: 'Talents' })
    lines.push({
      kind: 'text',
      text: `${budget.talentSlots} talent${budget.talentSlots === 1 ? '' : 's'} to select at creation`,
    })
  }

  for (const engine of occ.customAbilityEngines ?? []) {
    const picks = engine.progressionRoadmap
      ?.filter((step) => step.level <= 1)
      .reduce((sum, step) => sum + step.selectionsGained, 0)
    if (picks && picks > 0) {
      lines.push({ kind: 'lane', label: engine.label })
      lines.push({
        kind: 'text',
        text: `${picks} pick${picks === 1 ? '' : 's'} at level 1`,
      })
    }
  }

  if (occPsychicGateBypassed(occ)) {
    lines.push({
      kind: 'text',
      text: 'Natural psychic — no Psychic Matrix tier choice.',
    })
  }

  return lines
}



function formatOccVitalLines(occ: PalladiumOcc): string[] {
  const effective = resolveEffectivePalladiumOcc(occ)
  const lines: string[] = [
    ...formatVitalSubset(effective.staticBonuses?.vitals, VITAL_REMAINING_KEYS),
  ]
  if (occ.baseStats?.hpDice) {
    lines.push(`H.P.: ${occ.baseStats.hpDice} (base dice)`)
  }
  return lines
}

function formatOccCombatBonusLines(
  occ: PalladiumOcc,
  effective: PalladiumOcc,
): string[] {
  const sdcLines = [
    ...formatVitalSubset(effective.staticBonuses?.vitals, VITAL_COMBAT_KEYS),
  ]
  if (occ.baseStats?.sdcDice) {
    sdcLines.push(`S.D.C.: ${occ.baseStats.sdcDice} (base dice)`)
  }
  const { combat: combatLines } = splitCombatStaticBonuses(effective.staticBonuses?.combat)
  return [...sdcLines, ...combatLines]
}



function formatHandToHandLines(occ: PalladiumOcc): string[] {
  const tier = occStartingHandToHandTier(occ)
  const label = creationHandToHandTierLabel(tier)
  const lines: string[] = []



  if (label) {
    const granted = occGrantsDefaultHandToHand(occ)
    lines.push(granted ? `${label} (included)` : `${label} (required path)`)
  } else if ((occ.handToHandRules.upgradePaths ?? []).length > 0) {
    lines.push('None at creation — purchase via related or secondary skills')
  }



  for (const path of occ.handToHandRules.upgradePaths ?? []) {
    const targetTier = creationHandToHandTierFromSkillId(path.targetSkillId)
    const targetLabel = creationHandToHandTierLabel(targetTier)
    if (!targetLabel || path.electiveSlotCost <= 0) continue
    const slotLabel = path.electiveSlotCost === 1 ? 'related skill' : 'related skills'
    lines.push(
      `Upgrade to ${targetLabel} — ${path.electiveSlotCost} ${slotLabel}`,
    )
  }



  return lines
}



function formatOccCategoryAllowanceLines(
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
): string[] {
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const rules = effective.occRelatedSkills.categoryRules
  if (!rules.length) return []

  const lines: string[] = ['O.C.C. related categories']
  for (const rule of rules) {
    const { label } = formatOccCategoryRuleHeader(rule)
    lines.push(`${rule.categoryName} — ${label}`)
  }

  const forbidden = effective.secondarySkills.forbiddenCategories ?? []
  if (forbidden.length > 0) {
    lines.push('Secondary forbidden categories')
    for (const category of forbidden) {
      lines.push(`${category} — None`)
    }
  }

  return lines
}

function formatSkillAllowanceLines(
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
): string[] {
  const lines: string[] = []
  const relatedSlots = occRelatedSkillSlotBudget(occ)
  if (relatedSlots > 0) {
    lines.push(`${relatedSlots} O.C.C. related skill choices at creation`)
  }

  const secondarySlots = occSecondarySkillSlots(occ)
  if (secondarySlots > 0) {
    lines.push(`${secondarySlots} secondary skill choices at creation`)
  }

  const startingRelated = resolveEffectivePalladiumOcc(occ, specializationId)
    .occRelatedSkills.startingSkillIds
  if (startingRelated?.length) {
    lines.push(
      `Granted related skills: ${startingRelated.map((id) => skillDisplayName(id)).join(', ')}`,
    )
  }

  lines.push(...formatOccCategoryAllowanceLines(occ, specializationId))
  return lines
}



function buildRaceSections(race: Race | undefined): ConfiguratorPackageSection[] {
  if (!race) return []
  const sections: ConfiguratorPackageSection[] = []



  const attrReqLines = formatRaceAttributeDiceLines(race)
  const attrItems = attrReqLines.map((line) => `${line} (base roll)`)
  pushSection(sections, 'race-attributes-reqs', 'Attribute bonuses & requirements', attrItems)



  const specialAbilityItems = [
    ...formatClassAbilityLines(race.classAbilities),
    ...(race.defaultTraitIds?.map(
      (id) => getPalladiumTalentById(id)?.name ?? id.replace(/^talent_/, ''),
    ) ?? []),
  ]
  pushSection(
    sections,
    'race-special-abilities',
    'Special abilities & skills',
    specialAbilityItems,
  )



  const supernaturalItems: string[] = []
  const ispFormula = race.psionics.naturalIspFormula?.trim()
  if (
    race.psionics.capabilityType === 'innate' &&
    ispFormula &&
    ispFormula !== '0'
  ) {
    supernaturalItems.push('Psionic')
    supernaturalItems.push(
      `I.S.P.: ${ispFormula.replace(/\bME\b/gi, 'M.E.')}`,
    )
  }
  pushSection(
    sections,
    'race-supernatural',
    'Supernatural abilities',
    supernaturalItems.length > 0 ? supernaturalItems : ['N/A'],
  )

  const vitalItems = buildRaceVitalItems(race)
  pushSection(sections, 'race-vitals', 'Vitals', vitalItems)

  const bonusItems = buildRaceBonusItems(race)
  pushSection(
    sections,
    'race-bonuses',
    'Bonuses',
    bonusItems.length > 0 ? bonusItems : ['N/A'],
  )



  const innateSkills = race.innateSkills.map((grant) => {
    const name = skillDisplayName(grant.skillId)
    const pct =
      grant.basePercent != null
        ? ` (${grant.basePercent}% base)`
        : grant.bonusPercent != null
          ? ` (+${grant.bonusPercent}%)`
          : ''
    return `${name}${pct}`
  })
  pushSection(sections, 'race-innate-skills', 'Innate skills', innateSkills)



  if (!race.canPickOcc) {
    const forced = race.forcedOccId?.trim()
    pushSection(
      sections,
      'race-rcc',
      'R.C.C.',
      forced
        ? [
            `Shadow O.C.C. (${forced}) auto-mounts this race's skill program.`,
            'Manual O.C.C. selection is skipped.',
          ]
        : ['Self-contained — no separate O.C.C. selection or skill program.'],
    )
  }



  return sections
}



function buildOccSections(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
): ConfiguratorPackageSection[] {
  if (!occ?.id?.trim()) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const sections: ConfiguratorPackageSection[] = []



  pushSection(sections, 'occ-attributes-reqs', 'Attribute bonuses & requirements', [
    ...formatAttributeRequirementLines(occ),
    ...formatOccAttributeBonusLines(effective.staticBonuses?.attributes),
  ])

  pushSection(sections, 'occ-package-notes', 'Package notes', [
    ...(occ.packageNotes ?? []),
  ])

  const specializedOccAbilities = formatSpecializedOccClassAbilityLines(
    occ,
    effective.classAbilities,
  )
  pushSection(
    sections,
    'occ-special-abilities',
    'Specialized OCC abilities and skills',
    specializedOccAbilities.length > 0 ? specializedOccAbilities : ['N/A'],
  )



  pushSection(
    sections,
    'occ-supernatural',
    'Supernatural abilities',
    formatOccSupernaturalAbilityLines(occ, specializationId),
  )



  pushSection(sections, 'occ-vitals', 'S.D.C. / P.P.E. / I.S.P.', formatOccVitalLines(occ))



  const { nonCombat: nonCombatCombatLines } = splitCombatStaticBonuses(
    effective.staticBonuses?.combat,
  )
  pushSection(sections, 'occ-non-combat', 'Non-combat bonuses', [
    ...nonCombatCombatLines,
    ...formatStaticBonusLines(effective.staticBonuses?.saves, SAVE_LABELS),
  ])

  pushSection(sections, 'occ-hth', 'Hand-to-Hand', formatHandToHandLines(effective))

  pushSection(
    sections,
    'occ-combat',
    'Combat bonuses',
    formatOccCombatBonusLines(occ, effective),
  )



  const coreSkills: string[] = []
  for (const entry of effective.occSkillsCore) {
    if (isOccCoreSkillGrant(entry)) {
      const bonus =
        entry.bonusPercent != null && entry.bonusPercent !== 0
          ? ` (+${entry.bonusPercent}%)`
          : ''
      coreSkills.push(`${skillDisplayName(entry.skillId)}${bonus}`)
    } else if (isOccCoreSkillChoiceVoucher(entry)) {
      const bonus =
        entry.bonusPercent != null && entry.bonusPercent !== 0
          ? ` (+${entry.bonusPercent}% each)`
          : ''
      const scope = formatOccCoreVoucherCategoryScope(entry)
      const label = entry.label?.trim()
      coreSkills.push(
        label
          ? `${label}${bonus}`
          : `${entry.choiceCount}× choice — ${scope}${bonus}`,
      )
    }
  }
  pushSection(sections, 'occ-core-skills', 'O.C.C. core skills', coreSkills)



  const coreWps = (effective.wpRules.coreWps ?? []).map((id) => skillDisplayName(id))
  pushSection(sections, 'occ-wp', 'Weapon proficiencies', coreWps)



  pushSection(
    sections,
    'occ-skill-allowances',
    'Skill choice allowances',
    formatSkillAllowanceLines(occ, specializationId),
  )



  const equipment = effective.startingEquipment
  const gear: string[] = [
    ...(equipment?.weapons ?? []),
    ...(equipment?.armor ?? []),
    ...(equipment?.miscellaneous ?? []),
  ]
  pushSection(sections, 'occ-gear', 'Starting equipment', gear)



  return sections
}



export function buildConfiguratorPackageSummary(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  opts?: { showOcc?: boolean },
): ConfiguratorPackageSummary {
  const showOcc = opts?.showOcc ?? true
  const sections: ConfiguratorPackageSection[] = []



  if (race) {
    sections.push({
      id: 'race-heading',
      title: race.name,
      items: [],
    })
    sections.push(...buildRaceSections(race))
  }



  if (showOcc && occ?.id?.trim()) {
    const spec = occ.specializations?.find((s) => s.id === specializationId)
    const occTitle = spec ? `${occ.name} — ${spec.name}` : occ.name
    sections.push({
      id: 'occ-heading',
      title: occTitle,
      items: [],
    })
    sections.push(...buildOccSections(occ, specializationId))
  }



  return { sections }
}



