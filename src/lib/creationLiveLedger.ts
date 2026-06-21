import type {
  AccumulatedHandToHandBonuses,
  ActiveForm,
  Character,
  CharacterAttributes,
  FeatureModifiers,
  MorphusAttributeRollBonuses,
  PalladiumOcc,
  PsychicTier,
  Race,
  StrengthCapacities,
} from '../types'
import { getFormState } from '../types'
import {
  computeHorrorFactorAura,
  creationLedgerSaveModifierAttribution,
  type HorrorFactorProfile,
} from './saveProfile'
import { computeAttributeSaveProfile } from './attributeSaves'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { computeCombatMirrorBonuses } from './characterDerived'
import { occAttributeRequirementSuffix } from './creationAttributeSync'
import { occVariableAttributeResolution } from './occVariableBonus'
import {
  buildForgeAttributeStatBonuses,
  buildSdcStatBonusDetails,
  formatAttributeValueTooltip,
  formatFlatValueTooltip,
  normalizeDiceDisplay,
  type LedgerFlatContribution,
  type LedgerStatDiceGroup,
} from './ledgerStatBonuses'
import { creationVitalityPreview } from './creationVitalityPreview'
import {
  buildAttrFormulaLedgerFields,
  dualFormPpeLedgerFormulaOpts,
  resolveIspCreationFormula,
  resolvePpeCreationFormula,
  resolvePpeFormulaParts,
  formatVitalLedgerTooltip,
  formatMorphusSdcValueTooltip,
} from './ledgerVitalFormula'
import { resolveCreationOccSkillIds } from './occCoreSkillVouchers'
import { characterHasDualForms } from './raceFormPolicy'
import { FACADE_LABEL } from './creationFormLabels'
import {
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { isDiceNotation, diceNotationBounds } from './diceNotationBounds'
import { formatBonus } from './combatQuickBonuses'
import { computeMaxApm, resolveAttacksPerMelee } from './meleeCombat'
import {
  handToHandAttackBonus,
  createEmptyAccumulatedHandToHandBonuses,
} from '../utils/combatCalculator'
import {
  getIqBonuses,
  getMaBonuses,
  getMeBonuses,
  getPbBonuses,
  getPeBonuses,
  getPsBonuses,
  getPpBonuses,
} from './attributeBonuses'
import { type SaveDeductionLine } from './saveProfile'
import { formatSheetBonusEquation, type SheetBonusLine } from './sheetBonuses'
import {
  creationHandToHandTierLabel,
  effectiveCreationHandToHandTier,
  sheetSkillIdForCreationHandToHandTier,
} from './creationHandToHandChoice'
import { occStartingOccSkillIds } from './occCatalogEngine'
import { occStaticNumericBonus } from './creationOccBonuses'
import { getSkillById } from '../data/skillLibrary'
import {
  aggregatePhysicalSkillCombatBonuses,
  type PhysicalCombatBonusKey,
} from './skillPhysicalBonuses'
import {
  FORGE_ATTRIBUTE_KEYS,
  type ForgeAttrKey,
} from './attributeKeys'
import {
  buildPendingDiceBlocks,
  pendingDiceBlockRunningTotal,
  sumPendingAttributeDiceBonuses,
  pendingAttributeDiceBreakdown,
  collectEnteredPendingDiceContributions,
  formatVitalityBlockValueTooltip,
  type PendingDiceBlock,
} from './spawnDiceBlocks'
import type { VitalAttrFlatTerm } from './ledgerVitalFormula'
import {
  applyLedgerAttributeScores,
  applyMorphusVsPrimaryCombatLedgerDiff,
  applyMorphusVsPrimaryExceptionalLedgerDiff,
  applyMorphusVsPrimaryExceptionalLedgerGroupDiff,
  applyMorphusVsPrimaryLedgerDiff,
  applyMorphusVsPrimaryLedgerGroupDiff,
  buildMorphusCreationAttributeBlock,
  buildMorphusCreationBasePassiveModifiers,
  MORPHUS_LEDGER_RACE_LABEL,
  buildMorphusTraitSdcBonusDetails,
  creationLedgerSavePassiveModifiers,
  creationLedgerTraitPassiveModifiers,
  morphusAttributeScoresFromLedgerLines,
  resolveCreationLedgerHandToHandAccumulated,
  strengthCapacitiesFromAttributes,
  effectiveLedgerHandToHandTier,
} from './morphusCreationLedger'
import { buildMorphusPassiveBundle } from './morphusPassiveBridge'
import {
  MORPHUS_HIT_POINTS_FORMULA,
  MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
  MORPHUS_SDC_BONUS_DICE,
} from './morphusNightbaneBase'
import type { CreationHandToHandTier } from './creationHandToHandChoice'

export const LEDGER_NA = '—'
/** Default Hand to Hand tier label in the creation ledger. */
export const LEDGER_HTH_NONE = 'None'
/** Unassigned creation attribute pool slot (not yet dragged onto the strip). */
export const LEDGER_UNASSIGNED = '—'

export type CreationLedgerLine = {
  label: string
  value: string
  hint?: string
  /** Race attribute roll — inline after label, before O.C.C. minimum. */
  inlineRaceRoll?: string
  /** O.C.C. attribute minimum in red after the race roll (e.g. `12+`). */
  labelSuffix?: string
  /** Grouped dice (Race / OCC / Skills) shown under the stat. */
  diceGroups?: LedgerStatDiceGroup[]
  /** Value includes flat bonuses from O.C.C. / skills. */
  valueModified?: boolean
  /** Hover breakdown for flat bonuses baked into {@link value}. */
  valueTooltip?: string
  /** Structured flat terms for vitality tooltip ordering (H.P., S.D.C., P.P.E., etc.). */
  flatTerms?: VitalAttrFlatTerm[]
  skillFlatTerms?: LedgerFlatContribution[]
  /** Facade S.D.C. total referenced by Morphus S.D.C. tooltips. */
  morphusFacadeSdc?: number
  /** Per-skill detail for the aggregated Skills segment in {@link hint}. */
  skillDetailTooltip?: string
}

export type CreationLedgerGroup = {
  title: string
  lines: CreationLedgerLine[]
}

export function ledgerBonus(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return LEDGER_NA
  return formatBonus(n)
}

export function ledgerPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return LEDGER_NA
  return `${n >= 0 ? '+' : ''}${n}%`
}

export function ledgerCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return LEDGER_NA
  return String(n)
}

function passiveSum(passive: FeatureModifiers, keys: readonly string[]): number {
  let total = 0
  for (const key of keys) {
    const v = passive[key]
    if (v != null && v !== 0) total += v
  }
  return total
}

function formatBonusBreakdown(parts: readonly SaveDeductionLine[]): string | undefined {
  const active = parts.filter((p) => p.amount !== 0)
  if (active.length === 0) return undefined
  return active.map((p) => `${p.label}: ${formatBonus(p.amount)}`).join(' · ')
}

function formatSaveValueTooltip(
  parts: readonly SaveDeductionLine[],
): string | undefined {
  const active = parts.filter((p) => p.amount !== 0)
  if (active.length === 0) return undefined
  return formatFlatValueTooltip(
    active.map((p) => ({ label: p.label, amount: p.amount })),
  )
}

function ledgerFromParts(parts: readonly SaveDeductionLine[]): CreationLedgerLine {
  const total = parts.reduce((sum, p) => sum + p.amount, 0)
  return {
    label: '',
    value: ledgerBonus(total),
    valueModified: total !== 0,
    valueTooltip: formatSaveValueTooltip(parts),
  }
}

function ledgerFromSheetDetail(
  label: string,
  detail: { total: number; lines: SheetBonusLine[] },
): CreationLedgerLine {
  const hint =
    detail.lines.length > 0
      ? formatSheetBonusEquation(detail, formatBonus)
      : undefined
  return {
    label,
    value: detail.total !== 0 ? formatBonus(detail.total) : LEDGER_NA,
    hint,
  }
}

const STAGING_KEYS = ['sdc', 'ps', 'pp', 'pe', 'spd'] as const

type SkillBonusAgg = {
  combat: Record<string, number>
  staging: Record<string, number>
  sources: Map<string, string[]>
}

function aggregateSkillPhysicalBonuses(skillIds: readonly string[]): SkillBonusAgg {
  const physical = aggregatePhysicalSkillCombatBonuses(skillIds)
  const combat: Record<string, number> = { ...physical.combat }
  const staging: Record<string, number> = {}
  const sources = new Map(physical.sources)

  for (const skillId of skillIds) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const name = entry?.name ?? skillId
    const bonuses = (entry as { physicalSkillBonuses?: Record<string, unknown> })
      ?.physicalSkillBonuses
    if (!bonuses) continue

    for (const [key, raw] of Object.entries(bonuses)) {
      if (
        typeof raw === 'number' &&
        Number.isFinite(raw) &&
        (STAGING_KEYS as readonly string[]).includes(key)
      ) {
        staging[key] = (staging[key] ?? 0) + raw
        const bucket = `staging.${key}`
        const list = sources.get(bucket) ?? []
        if (!list.includes(name)) list.push(name)
        sources.set(bucket, list)
      }
    }
  }

  return { combat, staging, sources }
}

function resolveCreationSkillIds(
  character: Character,
  occ: PalladiumOcc | undefined,
): string[] {
  const storedOccSkills = character.creationOccSkillIds ?? []
  const occSkillSeed =
    storedOccSkills.length > 0
      ? storedOccSkills
      : occ
        ? occStartingOccSkillIds(occ, character.occSpecializationId)
        : []
  return [
    ...resolveCreationOccSkillIds(
      occ,
      character.occSpecializationId,
      occSkillSeed,
      character.creationOccCoreVoucherPicks ?? {},
    ),
    ...flattenCreationSkillIds(getCreationRelatedPicks(character)),
    ...flattenCreationSkillIds(getCreationSecondaryPicks(character)),
  ]
}

function hthLedgerDisplayName(
  catalogName: string | null,
  tier: CreationHandToHandTier,
): string {
  if (catalogName) {
    return catalogName.replace(/^Hand-to-Hand:\s*/i, 'Hand to Hand: ')
  }
  if (tier === 'none') return LEDGER_HTH_NONE
  const label = creationHandToHandTierLabel(tier)
  return label ? `Hand to Hand: ${label}` : LEDGER_HTH_NONE
}

function hthShortLabel(catalogName: string | null, tierLabel: string | null): string | null {
  if (catalogName) {
    const stripped = catalogName
      .replace(/^Hand-to-Hand:\s*/i, '')
      .replace(/^Hand to Hand:\s*/i, '')
      .trim()
    if (stripped.length > 0) return stripped
  }
  return tierLabel
}

function occCombatLedgerPart(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  statKey: string,
  resolutions: Readonly<Record<string, number>>,
): SaveDeductionLine | null {
  const amount = occStaticNumericBonus(
    occ,
    specializationId,
    'combat',
    statKey,
    resolutions,
  )
  return amount ? { label: 'OCC', amount } : null
}

function perSkillCombatContributions(
  skillIds: readonly string[],
  key: PhysicalCombatBonusKey,
): readonly { name: string; amount: number }[] {
  const out: { name: string; amount: number }[] = []
  for (const skillId of skillIds) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const raw = (
      entry as { physicalSkillBonuses?: Record<string, number> }
    )?.physicalSkillBonuses?.[key]
    if (typeof raw === 'number' && raw !== 0) {
      out.push({ name: entry?.name ?? skillId, amount: raw })
    }
  }
  return out
}

function formatSkillSourcesTooltip(
  entries: readonly { name: string; amount: number }[],
): string | undefined {
  if (entries.length === 0) return undefined
  return entries.map((e) => `${e.name}: ${formatBonus(e.amount)}`).join(' · ')
}

function formatCombatValueTooltip(
  parts: readonly SaveDeductionLine[],
  skillEntries: readonly { name: string; amount: number }[],
): string | undefined {
  const detailParts: string[] = []
  for (const part of parts) {
    if (part.amount === 0) continue
    if (part.label === 'Skills' && skillEntries.length > 0) {
      for (const entry of skillEntries) {
        detailParts.push(`${entry.name} ${formatBonus(entry.amount)}`)
      }
      continue
    }
    detailParts.push(`${part.label} ${formatBonus(part.amount)}`)
  }
  if (detailParts.length === 0) return undefined
  return `(${detailParts.join(', ')})`
}

type OrderedCombatBonusInput = {
  attribute?: { label: string; amount: number }
  occ?: PalladiumOcc
  specializationId?: string | null
  occStatKey?: string
  occResolutions?: Readonly<Record<string, number>>
  passiveOcc?: number
  baseModifier?: number
  hth?: number
  hthShort?: string | null
  skillIds: readonly string[]
  skill: SkillBonusAgg
  skillKey: PhysicalCombatBonusKey
}

function buildOrderedCombatBonusParts(
  input: OrderedCombatBonusInput,
): {
  parts: SaveDeductionLine[]
  skillEntries: readonly { name: string; amount: number }[]
} {
  const parts: SaveDeductionLine[] = []

  if (input.attribute?.amount) {
    parts.push({ label: input.attribute.label, amount: input.attribute.amount })
  }

  const occStatic =
    input.occStatKey && input.occ
      ? occStaticNumericBonus(
          input.occ,
          input.specializationId,
          'combat',
          input.occStatKey,
          input.occResolutions ?? {},
        )
      : 0
  const occTotal = occStatic + (input.passiveOcc ?? 0)
  if (occTotal) parts.push({ label: 'OCC', amount: occTotal })

  if (input.baseModifier) {
    parts.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: input.baseModifier })
  }

  if (input.hth && input.hthShort) {
    parts.push({ label: `HtH ${input.hthShort}`, amount: input.hth })
  }

  const skillAmt = input.skill.combat[input.skillKey] ?? 0
  const skillEntries = perSkillCombatContributions(input.skillIds, input.skillKey)
  if (skillAmt) {
    parts.push({ label: 'Skills', amount: skillAmt })
  }

  return { parts, skillEntries }
}

function combatLedgerLineFromParts(
  label: string,
  parts: readonly SaveDeductionLine[],
  skillEntries: readonly { name: string; amount: number }[] = [],
): CreationLedgerLine {
  const total = parts.reduce((sum, p) => sum + p.amount, 0)
  const skillDetailTooltip = formatSkillSourcesTooltip(skillEntries)
  return {
    label,
    value: total !== 0 ? formatBonus(total) : LEDGER_NA,
    valueModified: total !== 0,
    hint: formatBonusBreakdown(parts),
    valueTooltip: formatCombatValueTooltip(parts, skillEntries),
    skillDetailTooltip,
  }
}

export const MORPHUS_SDC_FORMULA_HINT = `${FACADE_LABEL} + ${normalizeDiceDisplay(MORPHUS_SDC_BONUS_DICE)}`

function buildMindControlSaveLine(
  passive: FeatureModifiers,
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
  supportsDualForm: boolean,
  race?: Race,
): CreationLedgerLine {
  if (characterHasDualForms(character)) {
    return {
      label: 'Mind Control',
      value: 'Immune',
      valueModified: true,
      hint: 'Nightbane R.C.C.',
    }
  }
  const specId = character.occSpecializationId
  return saveLineWithAttribution(
    'Mind Control',
    occSaveLedgerPartsForForm(
      occ,
      specId,
      ['save_mind_control'],
      character.level,
      activeForm,
      supportsDualForm,
    ),
    character,
    activeForm,
    ['save_mind_control'],
    passive,
    supportsDualForm,
    race,
  )
}

function occSaveLedgerPartsForForm(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  keys: readonly string[],
  characterLevel: number,
  activeForm: ActiveForm,
  supportsDualForm: boolean,
): SaveDeductionLine[] {
  if (supportsDualForm && activeForm === 'morphus') return []
  return occSaveLedgerParts(occ, specializationId, keys, characterLevel)
}

function occSaveLedgerParts(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  keys: readonly string[],
  characterLevel = 1,
): SaveDeductionLine[] {
  let total = 0
  for (const key of keys) {
    total += occStaticNumericBonus(
      occ,
      specializationId,
      'saves',
      key,
      {},
      characterLevel,
    )
  }
  return total > 0 ? [{ label: 'O.C.C.', amount: total }] : []
}

function ledgerFromSheetDetailWithParts(
  label: string,
  detail: { total: number; lines: SheetBonusLine[] },
  extraParts: readonly SaveDeductionLine[],
): CreationLedgerLine {
  const lines: SheetBonusLine[] = [...detail.lines]
  for (const part of extraParts) {
    if (part.amount !== 0) lines.push(part)
  }
  const total = detail.total + extraParts.reduce((s, p) => s + p.amount, 0)
  const hint =
    lines.length > 0
      ? formatSheetBonusEquation({ total, lines }, formatBonus)
      : undefined
  return {
    label,
    value: total !== 0 ? formatBonus(total) : LEDGER_NA,
    hint,
  }
}

const ATTR_LEDGER_LABELS: Record<ForgeAttrKey, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}

/** Attribute totals with O.C.C. / skill / variable dice — used for exceptional bonus rows. */
export function resolveLedgerEffectiveAttributes(
  template: CharacterAttributes,
  assignments: Partial<Record<ForgeAttrKey, number>> = {},
  race?: Race,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  grantedSkillIds: readonly string[] = [],
  occVariableResolutions: Readonly<Record<string, number>> = {},
  pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>> = {},
): CharacterAttributes {
  let attrs = { ...template, ps: { ...template.ps } }
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const assigned = assignments[attr]
    const bundle = buildForgeAttributeStatBonuses(
      attr,
      race,
      occ,
      specializationId,
      grantedSkillIds,
    )
    const poolRoll =
      assigned != null && Number.isFinite(assigned) ? assigned : null
    const variableBonus = occVariableAttributeResolution(
      attr,
      occ,
      specializationId,
      occVariableResolutions,
    )
    const pendingBonus = pendingAttrBonuses[attr] ?? 0
    const total =
      poolRoll != null
        ? poolRoll + bundle.flatTotal + variableBonus + pendingBonus
        : bundle.flatTotal > 0 || pendingBonus > 0
          ? bundle.flatTotal + variableBonus + pendingBonus
          : null
    if (total == null) continue
    if (attr === 'ps') {
      attrs = { ...attrs, ps: { ...attrs.ps, score: total } }
    } else {
      attrs = { ...attrs, [attr]: total }
    }
  }
  return attrs
}

/** All eight attributes — dash until a pool roll is assigned on the attribute strip. */
function pendingDiceBlockById(
  blocks: readonly PendingDiceBlock[],
): Record<string, PendingDiceBlock> {
  return Object.fromEntries(blocks.map((block) => [block.id, block]))
}

function vitalityLedgerLineFromBlock(
  label: string,
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
  fallback: CreationLedgerLine,
): CreationLedgerLine {
  if (!block) return { ...fallback, label }
  const rolls = block.groups.flatMap((group) => group.rolls)
  const anyEntered = rolls.some((roll) => resolutions[roll.id] != null)
  if (!anyEntered && block.flatBaseline <= 0) {
    return { ...fallback, label }
  }
  const total = pendingDiceBlockRunningTotal(block, resolutions)
  const allEntered =
    rolls.length === 0 ||
    rolls.every((roll) => {
      const value = resolutions[roll.id]
      return (
        value != null &&
        Number.isFinite(value) &&
        value >= roll.min &&
        value <= roll.max
      )
    })
  return {
    label,
    value: String(total),
    hint: allEntered ? fallback.hint : block.hint ?? fallback.hint,
    valueModified:
      block.flatBaseline > 0 || anyEntered || fallback.valueModified === true,
    valueTooltip: formatVitalityBlockValueTooltip(
      block.flatTerms ?? fallback.flatTerms ?? [],
      block,
      resolutions,
      block.skillFlatTerms ?? fallback.skillFlatTerms,
    ),
    diceGroups: fallback.diceGroups,
  }
}

export function buildCreationAttributeBlock(
  _attrs: CharacterAttributes,
  assignments: Partial<Record<ForgeAttrKey, number>> = {},
  race?: Race,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  grantedSkillIds: readonly string[] = [],
  occVariableResolutions: Readonly<Record<string, number>> = {},
  pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>> = {},
  pendingAttrDiceBreakdown: Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> = {},
): CreationLedgerLine[] {
  return FORGE_ATTRIBUTE_KEYS.map((attr) => {
    const assigned = assignments[attr]
    const bundle = buildForgeAttributeStatBonuses(
      attr,
      race,
      occ,
      specializationId,
      grantedSkillIds,
    )
    const poolRoll =
      assigned != null && Number.isFinite(assigned) ? assigned : null
    const variableBonus = occVariableAttributeResolution(
      attr,
      occ,
      specializationId,
      occVariableResolutions,
    )
    const pendingBonus = pendingAttrBonuses[attr] ?? 0
    const total =
      poolRoll != null
        ? poolRoll + bundle.flatTotal + variableBonus + pendingBonus
        : bundle.flatTotal > 0 || pendingBonus > 0
          ? bundle.flatTotal + variableBonus + pendingBonus
          : null

    const hasBonuses =
      bundle.flatTotal > 0 || variableBonus > 0 || pendingBonus > 0
    return {
      label: ATTR_LEDGER_LABELS[attr],
      inlineRaceRoll: bundle.inlineRaceRoll,
      labelSuffix: occAttributeRequirementSuffix(occ, attr, specializationId),
      value: total != null ? String(total) : LEDGER_UNASSIGNED,
      valueModified: hasBonuses && total != null,
      valueTooltip: formatAttributeValueTooltip(
        poolRoll,
        bundle.flatBreakdown,
        variableBonus,
        pendingAttrDiceBreakdown[attr] ?? [],
      ),
      diceGroups: bundle.diceGroups.length > 0 ? bundle.diceGroups : undefined,
    }
  })
}

/** Exceptional attribute perks (17–30 table range) shown outside Save vs / Combat blocks. */
export function buildCreationExceptionalStandardBlock(
  attrs: CharacterAttributes,
  morphusAttributeRollBonuses?: MorphusAttributeRollBonuses,
): CreationLedgerLine[] {
  const iq = getIqBonuses(attrs.iq)
  const me = getMeBonuses(attrs.me)
  const ma = getMaBonuses(attrs.ma)
  const ps = getPsBonuses(attrs.ps.score)
  const pp = getPpBonuses(attrs.pp)
  const pe = getPeBonuses(attrs.pe)
  const pb = getPbBonuses(attrs.pb)

  const maTrust =
    ma.trustStandard + (morphusAttributeRollBonuses?.maTrustIntimidatePercent ?? 0)
  let pbCharm =
    pb.charmStandard + (morphusAttributeRollBonuses?.pbCharmImpressPercent ?? 0)
  const pbMin = morphusAttributeRollBonuses?.pbCharmImpressMinPercent
  if (pbMin != null) pbCharm = Math.max(pbCharm, pbMin)

  return [
    { label: 'I.Q. skill bonus', value: ledgerPercent(iq.skillBonusStandard) },
    { label: 'I.Q. perception bonus', value: ledgerBonus(iq.perceptionStandard) },
    {
      label: 'M.E. save vs psionic / insanity',
      value: ledgerBonus(me.saveStandard),
    },
    { label: 'M.A. trust / intimidate', value: ledgerPercent(maTrust) },
    { label: 'P.S. HtH combat damage', value: ledgerBonus(ps.damageBonus) },
    { label: 'P.P. strike / parry / dodge', value: ledgerBonus(pp.combatStandard) },
    {
      label: 'P.E. save vs magic / poisons',
      value: ledgerBonus(pe.saveStandard),
    },
    {
      label: 'P.E. save vs coma / death',
      value: ledgerPercent(pe.comaDeathStandard),
    },
    { label: 'P.B. charm / impress', value: ledgerPercent(pbCharm) },
  ]
}

/** Superhuman exceptional perks (31+) — one group per attribute above 30. */
export function buildCreationExceptionalSuperGroups(
  attrs: CharacterAttributes,
): CreationLedgerGroup[] {
  const groups: CreationLedgerGroup[] = []

  if (attrs.iq > 30) {
    const iq = getIqBonuses(attrs.iq)
    const lines: CreationLedgerLine[] = []
    if (iq.skillBonusSuper > 0) {
      lines.push({
        label: 'I.Q. skill bonus',
        value: ledgerPercent(iq.skillBonusSuper),
      })
    }
    if (iq.perceptionSuper > 0) {
      lines.push({
        label: 'I.Q. perception bonus',
        value: ledgerBonus(iq.perceptionSuper),
      })
    }
    if (iq.saveIllusion > 0) {
      lines.push({
        label: 'I.Q. save vs illusions',
        value: ledgerBonus(iq.saveIllusion),
      })
    }
    if (lines.length > 0) groups.push({ title: 'I.Q. (31+)', lines })
  }

  if (attrs.me > 30) {
    const me = getMeBonuses(attrs.me)
    const lines: CreationLedgerLine[] = []
    if (me.savePossessionSuper > 0) {
      lines.push({
        label: 'M.E. save vs possession',
        value: ledgerBonus(me.savePossessionSuper),
      })
    }
    if (lines.length > 0) groups.push({ title: 'M.E. (31+)', lines })
  }

  if (attrs.ma > 30) {
    const ma = getMaBonuses(attrs.ma)
    const lines: CreationLedgerLine[] = []
    if (ma.perceptionPenaltyToOthers > 0) {
      lines.push({
        label: 'M.A. perception penalty (others)',
        value: ledgerBonus(ma.perceptionPenaltyToOthers),
      })
    }
    for (const [skill, bonus] of Object.entries(ma.specificSkillBonuses)) {
      if (bonus === 0) continue
      lines.push({ label: `M.A. ${skill}`, value: ledgerPercent(bonus) })
    }
    if (lines.length > 0) groups.push({ title: 'M.A. (31+)', lines })
  }

  if (attrs.ps.score > 30) {
    const ps = getPsBonuses(attrs.ps.score)
    const lines: CreationLedgerLine[] = []
    if (ps.throwRangeSuper > 0) {
      lines.push({
        label: 'P.S. throw range',
        value: `+${ps.throwRangeSuper} ft`,
      })
    }
    if (ps.liftCarrySuper > 0) {
      lines.push({
        label: 'P.S. lift / carry',
        value: ledgerPercent(ps.liftCarrySuper),
      })
    }
    if (lines.length > 0) groups.push({ title: 'P.S. (31+)', lines })
  }

  if (attrs.pp > 30) {
    const pp = getPpBonuses(attrs.pp)
    const lines: CreationLedgerLine[] = []
    if (pp.initiativeSuper > 0) {
      lines.push({
        label: 'P.P. initiative',
        value: ledgerBonus(pp.initiativeSuper),
      })
    }
    if (lines.length > 0) groups.push({ title: 'P.P. (31+)', lines })
  }

  if (attrs.pe > 30) {
    const pe = getPeBonuses(attrs.pe)
    const lines: CreationLedgerLine[] = []
    if (pe.comaDeathSuper > 0) {
      lines.push({
        label: 'P.E. save vs coma / death',
        value: ledgerPercent(pe.comaDeathSuper),
      })
    }
    if (pe.halfFatigue) {
      lines.push({ label: 'P.E. fatigue rate', value: '½ rate' })
    }
    if (pe.imperviousDisease) {
      lines.push({ label: 'P.E. disease', value: 'Impervious' })
    }
    if (lines.length > 0) groups.push({ title: 'P.E. (31+)', lines })
  }

  if (attrs.pb > 30) {
    const pb = getPbBonuses(attrs.pb)
    const lines: CreationLedgerLine[] = []
    for (const [skill, bonus] of Object.entries(pb.specificSkillBonuses)) {
      if (bonus === 0) continue
      lines.push({ label: `P.B. ${skill}`, value: ledgerPercent(bonus) })
    }
    if (lines.length > 0) groups.push({ title: 'P.B. (31+)', lines })
  }

  return groups
}

export function buildCreationVitalsBlock(opts: {
  character: Character
  attrs: CharacterAttributes
  race: Race | undefined
  occ: PalladiumOcc | undefined
  supportsDualForm: boolean
  psychicTier: string
  activeForm: ActiveForm
  passive: FeatureModifiers
  horrorFactorProfile: HorrorFactorProfile
  skillIds: readonly string[]
  /** Facade effective P.E. for dual-form P.P.E. (always Facade, even on Morphus ledger). */
  ppePeScore?: number
  /** Resolved attribute totals for vital formulas (Morphus ledger uses Morphus attrs). */
  attrScores?: Partial<Record<ForgeAttrKey, number>>
}): CreationLedgerLine[] {
  const assignments = opts.character.creationAttributeAssignments ?? {}
  const resolutions = opts.character.creationPendingDiceResolutions ?? {}
  const formulaAttrOpts = { attrScores: opts.attrScores }
  const preview = creationVitalityPreview(opts.character, opts.race, opts.occ, {
    psychicTier: opts.psychicTier,
    assignments,
    supportsDualForm: opts.supportsDualForm,
  })
  const showIsp =
    opts.psychicTier !== 'none' || opts.character.psychicGateBypassed === true
  const pendingBlocks = buildPendingDiceBlocks(
    opts.character,
    opts.race,
    opts.occ,
    {
      supportsDualForm: opts.supportsDualForm,
      psychicTier: opts.psychicTier,
    },
  )
  const pendingById = pendingDiceBlockById(pendingBlocks)

  const hpFormula = opts.race ? (opts.race.vitals?.hpFormula ?? 'PE + 1D6') : null
  const hpFields = buildAttrFormulaLedgerFields(hpFormula, assignments, {
    hintOverride: preview.primaryHpRollHint,
    formulaSources: hpFormula ? { race: hpFormula } : undefined,
    ...formulaAttrOpts,
  })
  const ppeFormula =
    opts.race && opts.occ?.id?.trim()
      ? resolvePpeCreationFormula(opts.race, opts.occ)
      : null
  const ppeFormulaParts = resolvePpeFormulaParts(opts.race, opts.occ)
  const ppePeScore = opts.ppePeScore ?? opts.attrs.pe
  const ppeDualOpts = opts.supportsDualForm
    ? dualFormPpeLedgerFormulaOpts(ppePeScore)
    : formulaAttrOpts
  const ppeFields = buildAttrFormulaLedgerFields(ppeFormula, assignments, {
    perLevelFormula: opts.occ?.ppeEngine?.perLevelFormula,
    formulaSources: {
      race: ppeFormulaParts.race,
      occ: ppeFormulaParts.occ,
    },
    ...ppeDualOpts,
  })
  const ispFormula = resolveIspCreationFormula(opts.occ, opts.psychicTier, showIsp)
  const ispFields = ispFormula
    ? buildAttrFormulaLedgerFields(ispFormula.base, assignments, {
        perLevelFormula: ispFormula.perLevel,
        hintOverride: preview.ispRollHint,
        formulaSources: { occ: ispFormula.base },
        ...formulaAttrOpts,
      })
    : null

  const ar = passiveSum(opts.passive, [
    'ar',
    'natural_armor',
    'armor_rating',
    'natural_armor_rating',
  ])

  const sdcDetails = buildSdcStatBonusDetails(
    opts.race,
    opts.occ,
    opts.character.occSpecializationId,
    opts.skillIds,
    opts.character.creationOccVariableResolutions ?? {},
  )

  const morphusLedger = opts.supportsDualForm && opts.activeForm === 'morphus'
  const traitSdc = morphusLedger
    ? buildMorphusTraitSdcBonusDetails(opts.character)
    : { flatTotal: 0, flatBreakdown: [], diceContributions: [] }

  const morphusPeScore = opts.attrs.pe
  const hpLine = morphusLedger
    ? vitalityLedgerLineFromBlock('H.P.', pendingById.morphus_hp, resolutions, {
        label: 'H.P.',
        ...buildAttrFormulaLedgerFields(MORPHUS_HIT_POINTS_FORMULA, assignments, {
          hintOverride: `P.E. ×2 + ${normalizeDiceDisplay(MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA)}/level`,
          attrScores: { pe: morphusPeScore },
          formulaSources: { race: MORPHUS_HIT_POINTS_FORMULA },
        }),
      })
    : vitalityLedgerLineFromBlock('H.P.', pendingById.hp, resolutions, {
        label: 'H.P.',
        ...hpFields,
      })

  const morphusFacadeSdc =
    pendingById.sdc != null
      ? pendingDiceBlockRunningTotal(pendingById.sdc, resolutions)
      : sdcDetails.flatTotal
  const morphusSdcFlatTotal = morphusFacadeSdc + traitSdc.flatTotal

  const sdcLine = morphusLedger
    ? vitalityLedgerLineFromBlock('S.D.C.', pendingById.morphus_sdc, resolutions, {
        label: 'S.D.C.',
        value:
          morphusSdcFlatTotal > 0 || pendingById.morphus_sdc
            ? String(
                pendingById.morphus_sdc
                  ? pendingDiceBlockRunningTotal(pendingById.morphus_sdc, resolutions)
                  : morphusSdcFlatTotal,
              )
            : preview.primarySdcValue,
        valueModified:
          morphusSdcFlatTotal > 0 ||
          traitSdc.diceContributions.length > 0 ||
          (pendingById.morphus_sdc?.flatBaseline ?? 0) > 0,
        morphusFacadeSdc,
        skillFlatTerms: traitSdc.flatBreakdown,
        valueTooltip: formatMorphusSdcValueTooltip(
          morphusFacadeSdc,
          [],
          traitSdc.flatBreakdown,
        ),
        hint:
          traitSdc.diceContributions.length > 0
            ? `${MORPHUS_SDC_FORMULA_HINT} + traits`
            : MORPHUS_SDC_FORMULA_HINT,
      })
    : vitalityLedgerLineFromBlock('S.D.C.', pendingById.sdc, resolutions, {
        label: 'S.D.C.',
        value:
          sdcDetails.flatTotal > 0
            ? String(sdcDetails.flatTotal)
            : preview.primarySdcValue,
        valueModified: sdcDetails.flatTotal > 0,
        valueTooltip: formatVitalLedgerTooltip(
          sdcDetails.flatVitalTerms,
          [],
          sdcDetails.skillFlats,
        ),
        flatTerms: sdcDetails.flatVitalTerms,
        skillFlatTerms: sdcDetails.skillFlats,
        diceGroups:
          sdcDetails.diceGroups.length > 0 ? sdcDetails.diceGroups : undefined,
      })

  const lines: CreationLedgerLine[] = [
    hpLine,
    sdcLine,
    vitalityLedgerLineFromBlock('P.P.E.', pendingById.ppe, resolutions, {
      label: 'P.P.E.',
      ...ppeFields,
    }),
    showIsp && ispFields
      ? vitalityLedgerLineFromBlock('I.S.P.', pendingById.isp, resolutions, {
          label: 'I.S.P.',
          ...ispFields,
        })
      : { label: 'I.S.P.', value: LEDGER_NA },
    {
      label: 'H.F.',
      value:
        opts.horrorFactorProfile.total != null && opts.horrorFactorProfile.total > 0
          ? String(opts.horrorFactorProfile.total)
          : LEDGER_NA,
      valueModified: (opts.horrorFactorProfile.contributions?.length ?? 0) > 0,
      valueTooltip: formatSaveValueTooltip(opts.horrorFactorProfile.contributions),
    },
    { label: 'Natural A.R.', value: ar > 0 ? String(ar) : LEDGER_NA },
  ]

  return lines
}

function saveLineWithAttribution(
  label: string,
  parts: SaveDeductionLine[],
  character: Character,
  activeForm: ActiveForm,
  passiveKeys: readonly string[],
  _passive: FeatureModifiers,
  supportsDualForm = false,
  race?: Race,
): CreationLedgerLine {
  const attrLines = creationLedgerSaveModifierAttribution(
    passiveKeys,
    character,
    activeForm,
    { supportsDualForm, race },
  )
  const allParts = [...parts, ...attrLines]
  const line = ledgerFromParts(allParts)
  return { ...line, label }
}

export function buildCreationSavesBlock(
  attrs: CharacterAttributes,
  passive: FeatureModifiers,
  character: Character,
  activeForm: ActiveForm,
  occ?: PalladiumOcc,
  supportsDualForm = false,
  primaryMe?: number,
  _psychicTier: PsychicTier = 'none',
  race?: Race,
): CreationLedgerLine[] {
  const specId = character.occSpecializationId
  const iq = getIqBonuses(attrs.iq)
  const me = getMeBonuses(attrs.me)
  const pe = getPeBonuses(attrs.pe)

  const magicKeys = [
    'save_magic',
    'save_magic_spell',
    'save_spell',
    'save_magic_ritual',
    'save_ritual',
  ] as const
  const psionicsKeys = ['save_psionics', 'save_isp'] as const
  const illusionKeys = ['save_illusions', 'save_illusion'] as const
  const poisonKeys = [
    'save_poison',
    'save_poison_lethal',
    'save_poison_nonlethal',
    'save_drugs',
    'save_harmful_drugs',
  ] as const

  return [
    saveLineWithAttribution(
      'Magic',
      [
        ...(pe.saveMagic ? [{ label: 'P.E.', amount: pe.saveMagic }] : []),
        ...occSaveLedgerPartsForForm(
          occ,
          specId,
          [...magicKeys],
          character.level,
          activeForm,
          supportsDualForm,
        ),
      ],
      character,
      activeForm,
      magicKeys,
      passive,
      supportsDualForm,
      race,
    ),
    saveLineWithAttribution(
      'Psionics',
      [
        ...(me.savePsionics ? [{ label: 'M.E.', amount: me.savePsionics }] : []),
        ...occSaveLedgerPartsForForm(
          occ,
          specId,
          ['save_psionics', 'save_isp'],
          character.level,
          activeForm,
          supportsDualForm,
        ),
      ],
      character,
      activeForm,
      psionicsKeys,
      passive,
      supportsDualForm,
      race,
    ),
    saveLineWithAttribution(
      'Horror Factor',
      occSaveLedgerPartsForForm(
        occ,
        specId,
        ['save_horror', 'save_horror_factor'],
        character.level,
        activeForm,
        supportsDualForm,
      ),
      character,
      activeForm,
      ['save_horror', 'save_horror_factor'],
      passive,
      supportsDualForm,
      race,
    ),
    saveLineWithAttribution(
      'Illusions',
      iq.saveIllusion ? [{ label: 'I.Q. (31+)', amount: iq.saveIllusion }] : [],
      character,
      activeForm,
      illusionKeys,
      passive,
      supportsDualForm,
      race,
    ),
    pe.imperviousDisease
      ? {
          label: 'Disease',
          value: 'Impervious',
          hint: 'P.E. 30+',
        }
      : saveLineWithAttribution(
          'Disease',
          [],
          character,
          activeForm,
          ['save_disease'],
          passive,
          supportsDualForm,
          race,
        ),
    saveLineWithAttribution(
      'Insanity',
      me.saveInsanity ? [{ label: 'M.E.', amount: me.saveInsanity }] : [],
      character,
      activeForm,
      ['save_insanity'],
      passive,
      supportsDualForm,
      race,
    ),
    saveLineWithAttribution(
      'Poison / Toxins',
      pe.savePoison ? [{ label: 'P.E.', amount: pe.savePoison }] : [],
      character,
      activeForm,
      poisonKeys,
      passive,
      supportsDualForm,
      race,
    ),
    saveLineWithAttribution(
      'Possession',
      [
        ...(me.savePossession ? [{ label: 'M.E. (31+)', amount: me.savePossession }] : []),
        ...occSaveLedgerPartsForForm(
          occ,
          specId,
          ['save_possession'],
          character.level,
          activeForm,
          supportsDualForm,
        ),
      ],
      character,
      activeForm,
      ['save_possession'],
      passive,
      supportsDualForm,
      race,
    ),
    buildMindControlSaveLine(passive, character, activeForm, occ, supportsDualForm, race),
    {
      label: 'Coma / Death',
      value: ledgerPercent(pe.comaDeathPercent),
      hint:
        pe.comaDeathStandard > 0 || pe.comaDeathSuper > 0
          ? [
              pe.comaDeathStandard > 0
                ? `P.E. (17–30): ${ledgerPercent(pe.comaDeathStandard)}`
                : null,
              pe.comaDeathSuper > 0
                ? `P.E. (31+): ${ledgerPercent(pe.comaDeathSuper)}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined,
    },
    ...computeAttributeSaveProfile(attrs.pe, attrs.me, character.level, supportsDualForm, {
      primaryMe,
    }).map((row) => ({
      label: row.sheetLabel,
      value:
        row.totalRollBonus != null && row.totalRollBonus !== 0
          ? ledgerBonus(row.totalRollBonus)
          : '—',
      valueModified: (row.totalRollBonus ?? 0) !== 0,
      valueTooltip:
        row.rollBonuses.length > 0
          ? formatFlatValueTooltip(
              row.rollBonuses.map((bonus) => ({
                label: bonus.label,
                amount: bonus.amount,
              })),
            )
          : undefined,
      hint: row.notes,
    })),
  ]
}

export type CreationCombatLedger = {
  strike: number
  parry: number
  dodge: number
  rollWithPunchFallImpact: number
  pullPunch: number
  initiative: number
  attacksPerMelee: number
  entangle: number
  entangleUnlocked: boolean
  disarm: number
  disarmUnlocked: boolean
  handToHandDamage: number
}

export type CreationCombatDamageContext = {
  effectivePs?: number
  occ?: PalladiumOcc
  specializationId?: string | null
  occResolutions?: Readonly<Record<string, number>>
  passive?: FeatureModifiers
}

export function buildCreationCombatLedger(
  attrs: CharacterAttributes,
  skillIds: readonly string[],
  level: number,
  handToHand?: AccumulatedHandToHandBonuses,
  strengthCapacities?: StrengthCapacities,
  damageCtx?: CreationCombatDamageContext,
): CreationCombatLedger {
  const mirror = computeCombatMirrorBonuses(attrs)
  const skill = aggregateSkillPhysicalBonuses(skillIds)
  const hth = handToHand ?? createEmptyAccumulatedHandToHandBonuses()

  const strike = mirror.strike + (skill.combat.strike ?? 0) + hth.strike
  const parry = mirror.parry + (skill.combat.parry ?? 0) + hth.parry
  const dodge = mirror.dodge + (skill.combat.dodge ?? 0) + hth.dodge
  const pullPunch = (skill.combat.pullPunch ?? 0) + hth.pullPunch
  const rollWithPunchFallImpact =
    (skill.combat.rollWithImpact ?? 0) + hth.rollWithPunch
  const initiative = hth.initiative
  const attacksPerMelee =
    computeMaxApm(attrs, level, handToHandAttackBonus(hth)) +
    (skill.combat.apm ?? 0)

  const psScore = damageCtx?.effectivePs ?? attrs.ps.score
  const psDamage = getPsBonuses(psScore).damageBonus
  const occDamage = damageCtx?.occ
    ? occStaticNumericBonus(
        damageCtx.occ,
        damageCtx.specializationId,
        'combat',
        'damage',
        damageCtx.occResolutions ?? {},
      )
    : 0
  const passiveDamage = damageCtx?.passive?.bonusHthDamage ?? 0

  let handToHandDamage = psDamage + hth.damage + occDamage + passiveDamage
  if (strengthCapacities?.handToHandDamage.kind === 'supernatural') {
    handToHandDamage = 0
  }

  return {
    strike,
    parry,
    dodge,
    rollWithPunchFallImpact,
    pullPunch,
    initiative,
    attacksPerMelee,
    entangle: hth.entangleUnlocked ? hth.entangle : 0,
    entangleUnlocked: hth.entangleUnlocked,
    disarm: hth.disarmUnlocked ? hth.disarm : 0,
    disarmUnlocked: hth.disarmUnlocked,
    handToHandDamage,
  }
}

function buildAttacksPerMeleeLine(
  attrs: CharacterAttributes,
  level: number,
  hthAttackBonus: number,
  skillApm: number,
  traitApm: number,
  baseApm: number,
  hthLabel: string | null,
): CreationLedgerLine {
  const stack = resolveAttacksPerMelee(
    attrs,
    level,
    hthAttackBonus,
    skillApm,
    traitApm,
    baseApm,
  )

  const hintParts = ['Base: 2']
  if (hthAttackBonus > 0) {
    hintParts.push(
      hthLabel ? `HtH ${hthLabel}: +${hthAttackBonus}` : `Hand-to-hand: +${hthAttackBonus}`,
    )
  }
  if (skillApm > 0) hintParts.push(`Skills: +${skillApm}`)
  if (baseApm > 0) hintParts.push(`${MORPHUS_LEDGER_RACE_LABEL}: +${baseApm}`)
  if (traitApm > 0) hintParts.push(`O.C.C. / features: +${traitApm}`)

  return {
    label: 'Attacks / melee',
    value: ledgerCount(stack.total),
    hint: hintParts.join(' · '),
  }
}

function buildCreationPerceptionLine(
  attrs: CharacterAttributes,
  passive: FeatureModifiers,
  morphusBase: FeatureModifiers,
): CreationLedgerLine {
  const iqPerception = getIqBonuses(attrs.iq).perceptionBonus
  const parts: SaveDeductionLine[] = []
  if (iqPerception) parts.push({ label: 'I.Q.', amount: iqPerception })
  const baseAmt = morphusBase.perception ?? 0
  if (baseAmt) parts.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: baseAmt })
  const traitAmt = passive.perception ?? 0
  if (traitAmt) parts.push({ label: 'Features', amount: traitAmt })
  const line = combatLedgerLineFromParts('Perception', parts)
  return line
}

function buildCreationInitiativeLine(
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  passive: FeatureModifiers,
  morphusBase: FeatureModifiers,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const parts: SaveDeductionLine[] = []
  const occAmt = occStaticNumericBonus(
    occ,
    specializationId,
    'combat',
    'initiative',
    resolutions,
  )
  if (occAmt) parts.push({ label: 'OCC', amount: occAmt })
  const baseAmt = morphusBase.initiative ?? 0
  if (baseAmt) parts.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: baseAmt })
  const traitAmt = passive.initiative ?? 0
  if (traitAmt) parts.push({ label: 'Features', amount: traitAmt })
  if (handToHand?.initiative && hthShort) {
    parts.push({ label: `HtH ${hthShort}`, amount: handToHand.initiative })
  }
  const line = combatLedgerLineFromParts('Initiative', parts)
  return line
}

type CreationCombatStatKey = 'strike' | 'parry' | 'dodge'

function buildCreationCombatStatLine(
  label: string,
  statKey: CreationCombatStatKey,
  attrs: CharacterAttributes,
  skillIds: readonly string[],
  skill: SkillBonusAgg,
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  passive: FeatureModifiers,
  morphusBase: FeatureModifiers,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const pp = getPpBonuses(attrs.pp)
  const ppAmt =
    statKey === 'strike' ? pp.strike : statKey === 'parry' ? pp.parry : pp.dodge
  const { parts, skillEntries } = buildOrderedCombatBonusParts({
    attribute: ppAmt ? { label: 'P.P.', amount: ppAmt } : undefined,
    occ,
    specializationId,
    occStatKey: statKey,
    occResolutions: resolutions,
    passiveOcc: passive[statKey] ?? 0,
    baseModifier: morphusBase[statKey] ?? 0,
    hth: handToHand?.[statKey] ?? 0,
    hthShort,
    skillIds,
    skill,
    skillKey: statKey,
  })
  return combatLedgerLineFromParts(label, parts, skillEntries)
}

function buildCreationRollLine(
  skillIds: readonly string[],
  skill: SkillBonusAgg,
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  morphusBase: FeatureModifiers,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const { parts, skillEntries } = buildOrderedCombatBonusParts({
    occ,
    specializationId,
    occStatKey: 'rollWithPunch',
    occResolutions: resolutions,
    baseModifier: morphusBase.rollWithPunch ?? 0,
    hth: handToHand?.rollWithPunch ?? 0,
    hthShort,
    skillIds,
    skill,
    skillKey: 'rollWithImpact',
  })
  return combatLedgerLineFromParts('Roll w/ punch, fall, impact', parts, skillEntries)
}

function buildCreationPullPunchLine(
  skillIds: readonly string[],
  skill: SkillBonusAgg,
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const { parts, skillEntries } = buildOrderedCombatBonusParts({
    occ,
    specializationId,
    occStatKey: 'pullPunch',
    occResolutions: resolutions,
    hth: handToHand?.pullPunch ?? 0,
    hthShort,
    skillIds,
    skill,
    skillKey: 'pullPunch',
  })
  return combatLedgerLineFromParts('Pull punch', parts, skillEntries)
}

function buildHandToHandDamageLine(
  combat: CreationCombatLedger,
  damageCtx: CreationCombatDamageContext | undefined,
  effectivePs: number,
  handToHand?: AccumulatedHandToHandBonuses,
  strengthCapacities?: StrengthCapacities,
): CreationLedgerLine {
  if (strengthCapacities?.handToHandDamage.kind === 'supernatural') {
    const d = strengthCapacities.handToHandDamage
    return {
      label: 'Hand-to-hand damage (P.S.)',
      value: d.fullStrengthPunch,
      hint: `Restrained ${d.restrainedPunch} · Power ${d.powerPunch}`,
    }
  }

  const psPart = getPsBonuses(effectivePs).damageBonus
  const hthPart = handToHand?.damage ?? 0
  const occStatic = damageCtx?.occ
    ? occStaticNumericBonus(
        damageCtx.occ,
        damageCtx.specializationId,
        'combat',
        'damage',
        damageCtx.occResolutions ?? {},
      )
    : 0
  const occPart = occStatic + (damageCtx?.passive?.bonusHthDamage ?? 0)
  const parts: SaveDeductionLine[] = []
  if (psPart) parts.push({ label: 'P.S.', amount: psPart })
  if (occPart) parts.push({ label: 'OCC', amount: occPart })
  if (hthPart) parts.push({ label: 'Hand-to-hand', amount: hthPart })

  return {
    label: 'Hand-to-hand damage (P.S.)',
    value:
      combat.handToHandDamage !== 0
        ? formatBonus(combat.handToHandDamage)
        : LEDGER_NA,
    hint: formatBonusBreakdown(parts),
  }
}

/** Entangle row — maneuver gated; numeric bonuses apply only when unlocked. */
function buildCreationEntangleLine(
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  morphusBase: FeatureModifiers,
  passive: FeatureModifiers,
): CreationLedgerLine {
  if (!handToHand?.entangleUnlocked) {
    return { label: 'Entangle', value: LEDGER_NA, valueModified: false }
  }

  const parts: SaveDeductionLine[] = []
  if (handToHand.entangle && hthShort) {
    parts.push({ label: `HtH ${hthShort}`, amount: handToHand.entangle })
  }
  const baseAmt = morphusBase.entangle ?? 0
  if (baseAmt !== 0) parts.push({ label: 'Race', amount: baseAmt })
  const traitAmt = passive.entangle ?? 0
  if (traitAmt !== 0) parts.push({ label: 'Traits', amount: traitAmt })

  const total = parts.reduce((sum, p) => sum + p.amount, 0)
  return {
    label: 'Entangle',
    value: formatBonus(total),
    valueModified: true,
    hint: formatBonusBreakdown(parts),
    valueTooltip: formatCombatValueTooltip(parts),
  }
}

/** Disarm row — maneuver gated; numeric bonuses apply only when unlocked. */
function buildCreationDisarmLine(
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  morphusBase: FeatureModifiers,
  passive: FeatureModifiers,
): CreationLedgerLine {
  if (!handToHand?.disarmUnlocked) {
    return { label: 'Disarm', value: LEDGER_NA, valueModified: false }
  }

  const parts: SaveDeductionLine[] = []
  if (handToHand.disarm && hthShort) {
    parts.push({ label: `HtH ${hthShort}`, amount: handToHand.disarm })
  }
  const baseAmt = morphusBase.disarm ?? 0
  if (baseAmt !== 0) parts.push({ label: 'Race', amount: baseAmt })
  const traitAmt = passive.disarm ?? 0
  if (traitAmt !== 0) parts.push({ label: 'Traits', amount: traitAmt })

  const total = parts.reduce((sum, p) => sum + p.amount, 0)
  return {
    label: 'Disarm',
    value: formatBonus(total),
    valueModified: true,
    hint: formatBonusBreakdown(parts),
    valueTooltip: formatCombatValueTooltip(parts),
  }
}

/** Dedicated combat block — summed totals with per-source breakdown hints. */
export function buildCreationCombatBlock(
  character: Character,
  activeForm: ActiveForm,
  attrs: CharacterAttributes,
  combat: CreationCombatLedger,
  skillIds: readonly string[],
  level: number,
  passive: FeatureModifiers,
  supportsDualForm: boolean,
  morphusBase: FeatureModifiers = {},
  handToHand?: AccumulatedHandToHandBonuses,
  strengthCapacities?: StrengthCapacities,
  occ?: PalladiumOcc,
  effectivePs?: number,
): CreationLedgerLine[] {
  const hthTier = effectiveLedgerHandToHandTier(
    character,
    occ,
    activeForm,
    supportsDualForm,
  )
  const hthId = sheetSkillIdForCreationHandToHandTier(hthTier)
  const hthDef = hthId ? getSkillById(hthId) : undefined
  const hthDisplay = hthLedgerDisplayName(hthDef?.name ?? null, hthTier)
  const hthShort = hthShortLabel(
    hthDef?.name ?? null,
    creationHandToHandTierLabel(hthTier),
  )
  const occResolutions = character.creationOccVariableResolutions ?? {}
  const specId = character.occSpecializationId

  const skill = aggregateSkillPhysicalBonuses(skillIds)
  const hthApm = handToHandAttackBonus(handToHand ?? createEmptyAccumulatedHandToHandBonuses())
  const skillApm = skill.combat.apm ?? 0
  const baseApm = morphusBase.apm ?? 0
  const traitApm = passive.apm ?? 0

  const entangleLine = buildCreationEntangleLine(
    handToHand,
    hthShort,
    morphusBase,
    passive,
  )
  const disarmLine = buildCreationDisarmLine(
    handToHand,
    hthShort,
    morphusBase,
    passive,
  )

  const psForDamage = effectivePs ?? attrs.ps.score

  return [
    {
      label: 'Hand to Hand',
      value: hthDisplay,
    },
    buildAttacksPerMeleeLine(attrs, level, hthApm, skillApm, traitApm, baseApm, hthShort),
    buildCreationInitiativeLine(
      handToHand,
      hthShort,
      passive,
      morphusBase,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationPerceptionLine(attrs, passive, morphusBase),
    buildCreationCombatStatLine(
      'Strike',
      'strike',
      attrs,
      skillIds,
      skill,
      handToHand,
      hthShort,
      passive,
      morphusBase,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationCombatStatLine(
      'Parry',
      'parry',
      attrs,
      skillIds,
      skill,
      handToHand,
      hthShort,
      passive,
      morphusBase,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationCombatStatLine(
      'Dodge',
      'dodge',
      attrs,
      skillIds,
      skill,
      handToHand,
      hthShort,
      passive,
      morphusBase,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationRollLine(
      skillIds,
      skill,
      handToHand,
      hthShort,
      morphusBase,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationPullPunchLine(
      skillIds,
      skill,
      handToHand,
      hthShort,
      occ,
      specId,
      occResolutions,
    ),
    { ...entangleLine, label: 'Entangle' },
    { ...disarmLine, label: 'Disarm' },
    buildHandToHandDamageLine(
      combat,
      {
        occ,
        specializationId: specId,
        occResolutions,
        passive,
      },
      psForDamage,
      handToHand,
      strengthCapacities,
    ),
  ]
}

export type CreationPhysicalStaging = {
  lines: CreationLedgerLine[]
  pendingDiceLines: CreationLedgerLine[]
}

export function buildCreationPhysicalStaging(
  skillIds: readonly string[],
): CreationPhysicalStaging {
  const skill = aggregateSkillPhysicalBonuses(skillIds)
  const lines: CreationLedgerLine[] = []
  const pendingDiceLines: CreationLedgerLine[] = []

  for (const key of STAGING_KEYS) {
    const amt = skill.staging[key] ?? 0
    if (amt) {
      const src = skill.sources.get(`staging.${key}`)?.join(', ')
      lines.push({
        label: key.toUpperCase(),
        value: formatBonus(amt),
        hint: src ? `On Spawn: ${src}` : 'Applied on Spawn',
      })
    }
  }

  for (const skillId of skillIds) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const name = entry?.name ?? skillId
    const bonuses = (entry as { physicalSkillBonuses?: Record<string, unknown> })
      ?.physicalSkillBonuses
    if (!bonuses) continue
    for (const [key, raw] of Object.entries(bonuses)) {
      if (typeof raw !== 'string' || !isDiceNotation(raw)) continue
      const bounds = diceNotationBounds(raw)
      pendingDiceLines.push({
        label: `${name} — ${key.toUpperCase()}`,
        value: raw,
        hint: `${bounds.min}–${bounds.max} at Spawn`,
      })
    }
  }

  return { lines, pendingDiceLines }
}

export type CreationLiveLedgerSnapshot = {
  attributes: CreationLedgerLine[]
  exceptional: CreationLedgerLine[]
  exceptionalSuper: CreationLedgerGroup[]
  vitals: CreationLedgerLine[]
  saves: CreationLedgerLine[]
  combat: CreationLedgerLine[]
}

export function buildCreationLiveLedgerSnapshot(opts: {
  character: Character
  race: Race | undefined
  occ: PalladiumOcc | undefined
  supportsDualForm: boolean
  psychicTier: string
  activeForm: ActiveForm
}): CreationLiveLedgerSnapshot {
  const skillIds = resolveCreationSkillIds(opts.character, opts.occ)
  const pendingBlocks = buildPendingDiceBlocks(
    opts.character,
    opts.race,
    opts.occ,
    {
      supportsDualForm: opts.supportsDualForm,
      psychicTier: opts.psychicTier,
    },
  )
  const pendingAttrBonuses = sumPendingAttributeDiceBonuses(
    pendingBlocks,
    opts.character.creationPendingDiceResolutions ?? {},
  )
  const pendingAttrDiceBreakdown = pendingAttributeDiceBreakdown(
    pendingBlocks,
    opts.character.creationPendingDiceResolutions ?? {},
  )

  const primaryAttrs = getFormState(opts.character, 'primary').attributes
  const primaryEffectiveAttrs = resolveLedgerEffectiveAttributes(
    primaryAttrs,
    opts.character.creationAttributeAssignments,
    opts.race,
    opts.occ,
    opts.character.occSpecializationId,
    skillIds,
    opts.character.creationOccVariableResolutions ?? {},
    pendingAttrBonuses,
  )

  const primaryAttributeLines = buildCreationAttributeBlock(
    primaryAttrs,
    opts.character.creationAttributeAssignments,
    opts.race,
    opts.occ,
    opts.character.occSpecializationId,
    skillIds,
    opts.character.creationOccVariableResolutions ?? {},
    pendingAttrBonuses,
    pendingAttrDiceBreakdown,
  )

  const morphusLedger =
    opts.activeForm === 'morphus' && opts.supportsDualForm === true

  const attributeLines = morphusLedger
    ? buildMorphusCreationAttributeBlock(primaryAttributeLines, opts.character)
    : primaryAttributeLines

  const buildFormSections = (
    activeForm: ActiveForm,
    effectiveAttrs: CharacterAttributes,
    attrScores?: Partial<Record<ForgeAttrKey, number>>,
  ) => {
    const traitPassive = creationLedgerTraitPassiveModifiers(
      opts.character,
      activeForm,
      opts.occ,
    )
    const savePassive = creationLedgerSavePassiveModifiers(
      opts.character,
      activeForm,
      opts.occ,
      opts.supportsDualForm,
    )
    const morphusBase =
      activeForm === 'morphus' && opts.supportsDualForm
        ? buildMorphusCreationBasePassiveModifiers()
        : {}
    const morphusAttributeRollBonuses =
      activeForm === 'morphus' && opts.supportsDualForm
        ? buildMorphusPassiveBundle(opts.character, 'morphus', {})?.attributeRollBonuses
        : undefined
    const horrorFactorProfile = computeHorrorFactorAura(
      opts.character,
      activeForm,
      savePassive,
      opts.supportsDualForm,
      opts.race,
    )
    const handToHand = resolveCreationLedgerHandToHandAccumulated(
      opts.character,
      activeForm,
      opts.occ,
      opts.supportsDualForm,
    )
    const strengthCapacities = strengthCapacitiesFromAttributes(effectiveAttrs)
    const damageCtx: CreationCombatDamageContext = {
      effectivePs: effectiveAttrs.ps.score,
      occ: opts.occ,
      specializationId: opts.character.occSpecializationId,
      occResolutions: opts.character.creationOccVariableResolutions ?? {},
      passive: traitPassive,
    }
    const combatLedger = buildCreationCombatLedger(
      effectiveAttrs,
      skillIds,
      opts.character.level,
      handToHand,
      strengthCapacities,
      damageCtx,
    )

    return {
      exceptional: buildCreationExceptionalStandardBlock(
        effectiveAttrs,
        morphusAttributeRollBonuses,
      ),
      exceptionalSuper: buildCreationExceptionalSuperGroups(effectiveAttrs),
      vitals: buildCreationVitalsBlock({
        character: opts.character,
        attrs: effectiveAttrs,
        race: opts.race,
        occ: opts.occ,
        supportsDualForm: opts.supportsDualForm,
        psychicTier: opts.psychicTier,
        activeForm,
        passive: savePassive,
        horrorFactorProfile,
        skillIds,
        ppePeScore: opts.supportsDualForm ? primaryEffectiveAttrs.pe : effectiveAttrs.pe,
        attrScores,
      }),
      saves: buildCreationSavesBlock(
        effectiveAttrs,
        savePassive,
        opts.character,
        activeForm,
        opts.occ,
        opts.supportsDualForm,
        opts.supportsDualForm ? primaryEffectiveAttrs.me : undefined,
        (opts.psychicTier as PsychicTier) ?? 'none',
        opts.race,
      ),
      combat: buildCreationCombatBlock(
        opts.character,
        activeForm,
        effectiveAttrs,
        combatLedger,
        skillIds,
        opts.character.level,
        traitPassive,
        opts.supportsDualForm,
        morphusBase,
        handToHand,
        strengthCapacities,
        opts.occ,
        effectiveAttrs.ps.score,
      ),
    }
  }

  if (!morphusLedger) {
    const sections = buildFormSections('primary', primaryEffectiveAttrs)
    return {
      attributes: attributeLines,
      ...sections,
    }
  }

  const morphusAttrScores = morphusAttributeScoresFromLedgerLines(attributeLines)
  const morphusEffectiveAttrs = applyLedgerAttributeScores(
    primaryEffectiveAttrs,
    morphusAttrScores,
  )
  const primarySections = buildFormSections('primary', primaryEffectiveAttrs)
  const morphusSections = buildFormSections(
    'morphus',
    morphusEffectiveAttrs,
    morphusAttrScores,
  )

  return {
    attributes: attributeLines,
    exceptional: applyMorphusVsPrimaryExceptionalLedgerDiff(
      morphusSections.exceptional,
      primarySections.exceptional,
    ),
    exceptionalSuper: applyMorphusVsPrimaryExceptionalLedgerGroupDiff(
      morphusSections.exceptionalSuper,
      primarySections.exceptionalSuper,
    ),
    vitals: applyMorphusVsPrimaryLedgerDiff(
      morphusSections.vitals,
      primarySections.vitals,
    ),
    saves: morphusSections.saves,
    combat: applyMorphusVsPrimaryCombatLedgerDiff(
      morphusSections.combat,
      primarySections.combat,
    ),
  }
}
