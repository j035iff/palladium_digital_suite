import { getSkillById } from '../data/skillLibrary'
import { getWeaponProficiencyCatalogEntryById } from '../data/library/weaponProficienciesCatalogLoader'
import { getPalladiumTalentById } from '../data/library/talentCatalogLoader'
import type { OccClassAbility, PalladiumOcc, Race } from '../types'
import {
  creationHandToHandTierFromSkillId,
  creationHandToHandTierLabel,
  occStartingHandToHandTier,
} from './creationHandToHandChoice'
import {
  deriveOccCreation,
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
import {
  formatCreationSelectionPlanLines,
  formatPerLevelSelectionLine,
  occIspCreationSelectionPlan,
  occIspPerLevelSelection,
} from './occSupernaturalSelection'



export type ConfiguratorPackageSection = {
  id: string
  title: string
  items: readonly string[]
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
  'race-non-combat',
  'race-combat',
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



function skillDisplayName(skillId: string): string {
  return (
    getSkillById(skillId)?.name ??
    getWeaponProficiencyCatalogEntryById(skillId)?.name ??
    skillId.replace(/^skill_/, '').replace(/_/g, ' ')
  )
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
  items: string[],
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
): string[] {
  const lines: string[] = []
  const budget = occCreationAbilityBudget(occ)
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const hasMagic = Boolean(occ.ppeEngine) || budget.spellSlots > 0
  const hasPsionics = Boolean(occ.ispEngine) || budget.psionicSlots > 0

  if (hasMagic) {
    lines.push('Magic')
    if (occ.ppeEngine) {
      lines.push(
        `P.P.E.: ${occ.ppeEngine.baseFormula} (+ ${occ.ppeEngine.perLevelFormula}/level)`,
      )
    }
    lines.push(...formatVitalSubset(effective.staticBonuses?.vitals, new Set(['ppe'])))
    if (occ.baseStats?.ppeDice) {
      lines.push(`P.P.E.: ${occ.baseStats.ppeDice} (base dice)`)
    }
    if (budget.spellSlots > 0) {
      lines.push(
        `${budget.spellSlots} spell${budget.spellSlots === 1 ? '' : 's'} to select at creation`,
      )
      lines.push(`Spell strength cap at 1st level: ${occStartingSpellLevelCap(occ)}`)
      const spellRestrictions = occCreationSpellRestrictions(occ, 1)
      if (spellRestrictions.length) {
        lines.push(`Spell categories: ${spellRestrictions.join('; ')}`)
      }
    }
  }

  if (hasPsionics) {
    lines.push('Psionic')
    if (occ.ispEngine) {
      lines.push(
        `I.S.P.: ${occ.ispEngine.baseFormula} (+ ${occ.ispEngine.perLevelFormula}/level)`,
      )
      lines.push(`Save class: ${occ.ispEngine.savingThrowClass}`)
    }
    lines.push(...formatVitalSubset(effective.staticBonuses?.vitals, new Set(['isp'])))
    if (occ.baseStats?.ispDice) {
      lines.push(`I.S.P.: ${occ.baseStats.ispDice} (base dice)`)
    }
    if (budget.psionicSlots > 0) {
      const planLines = formatCreationSelectionPlanLines(occIspCreationSelectionPlan(occ))
      if (planLines.length) {
        for (const line of planLines) {
          lines.push(line)
        }
      } else {
        lines.push(
          `${budget.psionicSlots} psionic power${budget.psionicSlots === 1 ? '' : 's'} to select at creation`,
        )
        const psionicRestrictions = occCreationPsionicRestrictions(occ, 1)
        if (psionicRestrictions.length) {
          lines.push(`Psionic categories: ${psionicRestrictions.join('; ')}`)
        }
      }
      const perLevel = formatPerLevelSelectionLine(occIspPerLevelSelection(occ))
      if (perLevel) lines.push(perLevel)
    }
    lines.push(...formatPsionicGlobalRuleSummaryLines(occ))
  }

  if (budget.talentSlots > 0) {
    lines.push('Talents')
    lines.push(
      `${budget.talentSlots} talent${budget.talentSlots === 1 ? '' : 's'} to select at creation`,
    )
  }

  for (const engine of occ.customAbilityEngines ?? []) {
    const picks = engine.progressionRoadmap
      ?.filter((step) => step.level <= 1)
      .reduce((sum, step) => sum + step.selectionsGained, 0)
    if (picks && picks > 0) {
      lines.push(engine.label)
      lines.push(`${picks} pick${picks === 1 ? '' : 's'} at level 1`)
    }
  }

  if (occPsychicGateBypassed(occ)) {
    lines.push('Natural psychic — no Psychic Matrix tier choice.')
  }

  const derived = deriveOccCreation(occ, specializationId)
  for (const line of derived.supernaturalSummary) {
    if (
      line.startsWith('P.P.E.:') ||
      line.startsWith('I.S.P.:') ||
      line.startsWith('Spell strength cap') ||
      line.startsWith('Spell picks:') ||
      line.startsWith('Psionic picks:')
    ) {
      continue
    }
    lines.push(line)
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
  const passive = racePassiveModifiers(race)
  const attrBonusLine = formatPassiveAttributeBonuses(passive)
  const attrItems = [
    ...attrReqLines.map((line) => `${line} (base roll)`),
    ...(attrBonusLine ? [attrBonusLine] : []),
  ]
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
  const ppe = race.vitals.averageStandardPpe ?? race.vitals.basePpe
  if (ppe != null && String(ppe).trim() && String(ppe) !== '0') {
    supernaturalItems.push('Magic')
    supernaturalItems.push(`P.P.E.: ${ppe}`)
  }
  const ispFormula = race.psionics?.naturalIspFormula?.trim()
  if (ispFormula && ispFormula !== '0') {
    supernaturalItems.push('Psionic')
    supernaturalItems.push(
      `I.S.P.: ${ispFormula.replace(/\bME\b/gi, 'M.E.')}`,
    )
  }
  pushSection(sections, 'race-supernatural', 'Supernatural abilities', supernaturalItems)

  const vitalItems: string[] = []
  if (race.vitals.hpFormula) {
    vitalItems.push(`H.P.: ${race.vitals.hpFormula}`)
  }
  pushSection(sections, 'race-vitals', 'Hit points', vitalItems)



  const { combat: combatMods, nonCombat: nonCombatMods } = splitInnateCombatModifiers(
    race.innateBonuses?.modifiers,
  )
  const saveMods: Record<string, number> = {}
  for (const [key, value] of Object.entries(race.innateBonuses?.modifiers ?? {})) {
    if (typeof value !== 'number' || value === 0) continue
    if (key.startsWith('save_')) saveMods[key] = value
  }
  pushSection(sections, 'race-non-combat', 'Non-combat bonuses', [
    ...formatModifierLines(nonCombatMods, COMBAT_LABELS),
    ...formatModifierLines(saveMods, SAVE_LABELS),
  ])



  const raceSdcLines: string[] = []
  if (race.vitals.sdc != null) {
    const sdc =
      typeof race.vitals.sdc === 'string'
        ? race.vitals.sdc
        : race.vitals.sdc.defaultFormula
    raceSdcLines.push(`S.D.C.: ${sdc}`)
  }
  pushSection(sections, 'race-combat', 'Combat bonuses', [
    ...raceSdcLines,
    ...formatModifierLines(combatMods, COMBAT_LABELS),
  ])



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

  pushSection(
    sections,
    'occ-special-abilities',
    'Special abilities & skills',
    formatClassAbilityLines(effective.classAbilities),
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
      items: race.canPickOcc
        ? ['Racial package']
        : ['Racial Character Class (R.C.C.)'],
    })
    sections.push(...buildRaceSections(race))
  }



  if (showOcc && occ?.id?.trim()) {
    const spec = occ.specializations?.find((s) => s.id === specializationId)
    const occTitle = spec ? `${occ.name} — ${spec.name}` : occ.name
    sections.push({
      id: 'occ-heading',
      title: occTitle,
      items: ['O.C.C. package'],
    })
    sections.push(...buildOccSections(occ, specializationId))
  }



  return { sections }
}



