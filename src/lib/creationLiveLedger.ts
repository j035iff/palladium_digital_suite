import type {
  AccumulatedHandToHandBonuses,
  ActiveForm,
  Character,
  CharacterAttributes,
  FeatureModifiers,
  PalladiumOcc,
  Race,
  StrengthCapacities,
} from '../types'
import { computeHorrorFactorAura } from './saveProfile'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { computeCombatMirrorBonuses } from './characterDerived'
import { occAttributeRequirementSuffix } from './creationAttributeSync'
import { occVariableAttributeResolution } from './occVariableBonus'
import {
  buildForgeAttributeStatBonuses,
  buildSdcStatBonuses,
  formatAttributeValueTooltip,
  formatFlatValueTooltip,
  type LedgerStatDiceGroup,
} from './ledgerStatBonuses'
import { creationVitalityPreview } from './creationVitalityPreview'
import {
  buildAttrFormulaLedgerFields,
  resolveIspCreationFormula,
  resolvePpeCreationFormula,
} from './ledgerVitalFormula'
import { creationHpLabel, creationSdcLabel, creationIspLabel } from './creationFormLabels'
import { resolveCreationOccSkillIds } from './occCoreSkillVouchers'
import {
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { isDiceNotation, diceNotationBounds } from './diceNotationBounds'
import { formatBonus } from './combatQuickBonuses'
import { computeMaxApm } from './meleeCombat'
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
import { aggregateAllPassiveModifiers } from './featureEngine'
import { saveModifierAttribution, type SaveDeductionLine } from './saveProfile'
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

export const LEDGER_NA = 'N/A'
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

function ledgerFromParts(parts: readonly SaveDeductionLine[]): CreationLedgerLine {
  const total = parts.reduce((sum, p) => sum + p.amount, 0)
  return {
    label: '',
    value: ledgerBonus(total),
    hint: formatBonusBreakdown(parts),
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
  character: Character,
  occ: PalladiumOcc | undefined,
): string | null {
  if (catalogName) {
    return catalogName.replace(/^Hand-to-Hand:\s*/i, 'Hand to Hand: ')
  }
  const tier = effectiveCreationHandToHandTier(character, occ)
  const label = creationHandToHandTierLabel(tier)
  return label ? `Hand to Hand: ${label}` : null
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
  const line = ledgerFromParts(parts)
  const skillDetailTooltip = formatSkillSourcesTooltip(skillEntries)
  return {
    ...line,
    label,
    valueTooltip: formatCombatValueTooltip(parts, skillEntries),
    skillDetailTooltip,
  }
}

function occSaveLedgerParts(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  keys: readonly string[],
): SaveDeductionLine[] {
  if (!occ?.id?.trim()) return []
  let total = 0
  for (const key of keys) {
    total += occStaticNumericBonus(occ, specializationId, 'saves', key, {})
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
    const total =
      poolRoll != null
        ? poolRoll + bundle.flatTotal + variableBonus
        : bundle.flatTotal > 0
          ? bundle.flatTotal
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
export function buildCreationAttributeBlock(
  _attrs: CharacterAttributes,
  assignments: Partial<Record<ForgeAttrKey, number>> = {},
  race?: Race,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  grantedSkillIds: readonly string[] = [],
  occVariableResolutions: Readonly<Record<string, number>> = {},
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
    const total =
      poolRoll != null
        ? poolRoll + bundle.flatTotal + variableBonus
        : bundle.flatTotal > 0
          ? bundle.flatTotal
          : null

    const hasBonuses = bundle.flatTotal > 0 || variableBonus > 0
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
      ),
      diceGroups: bundle.diceGroups.length > 0 ? bundle.diceGroups : undefined,
    }
  })
}

/** Exceptional attribute perks (17–30 table range) shown outside Save vs / Combat blocks. */
export function buildCreationExceptionalStandardBlock(
  attrs: CharacterAttributes,
): CreationLedgerLine[] {
  const iq = getIqBonuses(attrs.iq)
  const me = getMeBonuses(attrs.me)
  const ma = getMaBonuses(attrs.ma)
  const ps = getPsBonuses(attrs.ps.score)
  const pp = getPpBonuses(attrs.pp)
  const pe = getPeBonuses(attrs.pe)
  const pb = getPbBonuses(attrs.pb)

  return [
    { label: 'I.Q. skill bonus', value: ledgerPercent(iq.skillBonusStandard) },
    { label: 'I.Q. perception bonus', value: ledgerBonus(iq.perceptionStandard) },
    {
      label: 'M.E. save vs psionic / insanity',
      value: ledgerBonus(me.saveStandard),
    },
    { label: 'M.A. trust / intimidate', value: ledgerPercent(ma.trustStandard) },
    { label: 'P.S. HtH combat damage', value: ledgerBonus(ps.damageBonus) },
    { label: 'P.P. strike / parry / dodge', value: ledgerBonus(pp.combatStandard) },
    {
      label: 'P.E. save vs magic / poisons',
      value: ledgerBonus(pe.saveStandard),
    },
    {
      label: 'P.E. save vs coma / death',
      value:
        pe.comaDeathStandard > 0 ? `${pe.comaDeathStandard}%` : LEDGER_NA,
    },
    { label: 'P.B. charm / impress', value: ledgerPercent(pb.charmStandard) },
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
        value: `${pe.comaDeathSuper}%`,
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
  horrorFactorTotal: number | null
  skillIds: readonly string[]
}): CreationLedgerLine[] {
  const assignments = opts.character.creationAttributeAssignments ?? {}
  const preview = creationVitalityPreview(opts.character, opts.race, opts.occ, {
    psychicTier: opts.psychicTier,
    assignments,
  })
  const showIsp =
    opts.psychicTier !== 'none' || opts.character.psychicGateBypassed === true

  const hpFormula = opts.race ? (opts.race.vitals?.hpFormula ?? 'PE + 1D6') : null
  const hpFields = buildAttrFormulaLedgerFields(hpFormula, assignments, {
    hintOverride: preview.facadeHpRollHint,
  })
  const ppeFormula =
    opts.race && opts.occ?.id?.trim()
      ? resolvePpeCreationFormula(opts.race, opts.occ)
      : null
  const ppeFields = buildAttrFormulaLedgerFields(ppeFormula, assignments, {
    perLevelFormula: opts.occ?.ppeEngine?.perLevelFormula,
  })
  const ispFormula = resolveIspCreationFormula(opts.occ, opts.psychicTier, showIsp)
  const ispFields = ispFormula
    ? buildAttrFormulaLedgerFields(ispFormula.base, assignments, {
        perLevelFormula: ispFormula.perLevel,
        hintOverride: preview.ispRollHint,
      })
    : null

  const ar = passiveSum(opts.passive, [
    'ar',
    'natural_armor',
    'armor_rating',
    'natural_armor_rating',
  ])

  const sdcBonuses = buildSdcStatBonuses(
    opts.race,
    opts.occ,
    opts.character.occSpecializationId,
    opts.skillIds,
    opts.character.creationOccVariableResolutions ?? {},
  )

  const lines: CreationLedgerLine[] = [
    { label: 'H.P.', ...hpFields },
    {
      label: 'S.D.C.',
      value:
        sdcBonuses.flatTotal > 0
          ? String(sdcBonuses.flatTotal)
          : preview.facadeSdcValue,
      valueModified: sdcBonuses.flatTotal > 0,
      valueTooltip: formatFlatValueTooltip(sdcBonuses.flatBreakdown),
      diceGroups:
        sdcBonuses.diceGroups.length > 0 ? sdcBonuses.diceGroups : undefined,
    },
    { label: 'P.P.E.', ...ppeFields },
    showIsp && ispFields
      ? { label: 'I.S.P.', ...ispFields }
      : { label: 'I.S.P.', value: LEDGER_NA },
    {
      label: 'H.F.',
      value:
        opts.horrorFactorTotal != null && opts.horrorFactorTotal > 0
          ? String(opts.horrorFactorTotal)
          : LEDGER_NA,
    },
    { label: 'Natural A.R.', value: ar > 0 ? String(ar) : LEDGER_NA },
  ]

  if (opts.supportsDualForm) {
    lines.push(
      {
        label: creationHpLabel(true, 'morphus'),
        ...buildAttrFormulaLedgerFields('PEx3 + 2D6*4', assignments, {
          hintOverride: 'P.E. ×3 + 2D6×4 (resolve at Spawn)',
        }),
      },
      {
        label: creationSdcLabel(true, 'morphus'),
        ...buildAttrFormulaLedgerFields('PEx4 + PSx2 + 2D6*8', assignments, {
          hintOverride: 'P.E.×4 + P.S.×2 + 2D6×8 (resolve at Spawn)',
        }),
      },
    )
  }

  return lines
}

function saveLineWithAttribution(
  label: string,
  parts: SaveDeductionLine[],
  character: Character,
  activeForm: ActiveForm,
  passiveKeys: readonly string[],
  passive: FeatureModifiers,
): CreationLedgerLine {
  const attrLines = saveModifierAttribution(passiveKeys, character, activeForm)
  const allParts = [...parts, ...attrLines]
  const passiveTotal = passiveSum(passive, passiveKeys)
  const attributed = attrLines.reduce((s, l) => s + l.amount, 0)
  const orphan = passiveTotal - attributed
  if (orphan !== 0) {
    allParts.push({ label: 'Other modifiers', amount: orphan })
  }
  const line = ledgerFromParts(allParts)
  return { ...line, label }
}

export function buildCreationSavesBlock(
  attrs: CharacterAttributes,
  passive: FeatureModifiers,
  character: Character,
  activeForm: ActiveForm,
  occ?: PalladiumOcc,
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
      pe.saveMagic ? [{ label: 'P.E.', amount: pe.saveMagic }] : [],
      character,
      activeForm,
      magicKeys,
      passive,
    ),
    saveLineWithAttribution(
      'Psionics',
      [
        ...(me.savePsionics ? [{ label: 'M.E.', amount: me.savePsionics }] : []),
        ...occSaveLedgerParts(occ, specId, ['save_psionics', 'save_isp']),
      ],
      character,
      activeForm,
      psionicsKeys,
      passive,
    ),
    saveLineWithAttribution(
      'Horror Factor',
      occSaveLedgerParts(occ, specId, ['save_horror', 'save_horror_factor']),
      character,
      activeForm,
      ['save_horror', 'save_horror_factor'],
      passive,
    ),
    saveLineWithAttribution(
      'Illusions',
      iq.saveIllusion ? [{ label: 'I.Q. (31+)', amount: iq.saveIllusion }] : [],
      character,
      activeForm,
      illusionKeys,
      passive,
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
        ),
    saveLineWithAttribution(
      'Insanity',
      me.saveInsanity ? [{ label: 'M.E.', amount: me.saveInsanity }] : [],
      character,
      activeForm,
      ['save_insanity'],
      passive,
    ),
    saveLineWithAttribution(
      'Poison / Toxins',
      pe.savePoison ? [{ label: 'P.E.', amount: pe.savePoison }] : [],
      character,
      activeForm,
      poisonKeys,
      passive,
    ),
    saveLineWithAttribution(
      'Possession',
      me.savePossession ? [{ label: 'M.E. (31+)', amount: me.savePossession }] : [],
      character,
      activeForm,
      ['save_possession'],
      passive,
    ),
    saveLineWithAttribution(
      'Mind Control',
      occSaveLedgerParts(occ, specId, ['save_mind_control']),
      character,
      activeForm,
      ['save_mind_control'],
      passive,
    ),
    {
      label: 'Coma / Death',
      value:
        pe.comaDeathPercent > 0 ? `${pe.comaDeathPercent}%` : LEDGER_NA,
      hint:
        pe.comaDeathStandard > 0 || pe.comaDeathSuper > 0
          ? [
              pe.comaDeathStandard > 0
                ? `P.E. (17–30): ${pe.comaDeathStandard}%`
                : null,
              pe.comaDeathSuper > 0
                ? `P.E. (31+): +${pe.comaDeathSuper}%`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined,
    },
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
  disarm: number
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
    entangle: hth.entangle,
    disarm: hth.disarm,
    handToHandDamage,
  }
}

function buildAttacksPerMeleeLine(
  attrs: CharacterAttributes,
  level: number,
  hthAttackBonus: number,
  skillApm: number,
  passiveApm: number,
  hthLabel: string | null,
): CreationLedgerLine {
  const levelBump = Math.min(3, Math.floor(level / 4))
  const core = computeMaxApm(attrs, level, hthAttackBonus)
  const total = core + skillApm + passiveApm

  const hintParts = ['Base: 2']
  if (levelBump > 0) hintParts.push(`Level: +${levelBump}`)
  if (hthAttackBonus > 0) {
    hintParts.push(
      hthLabel ? `HtH ${hthLabel}: +${hthAttackBonus}` : `Hand-to-hand: +${hthAttackBonus}`,
    )
  }
  if (skillApm > 0) hintParts.push(`Skills: +${skillApm}`)
  if (passiveApm > 0) hintParts.push(`O.C.C. / features: +${passiveApm}`)

  return {
    label: 'Attacks / melee',
    value: ledgerCount(total),
    hint: hintParts.join(' · '),
  }
}

function buildCreationInitiativeLine(
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  passive: FeatureModifiers,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const parts: SaveDeductionLine[] = []
  const occAmt =
    occStaticNumericBonus(occ, specializationId, 'combat', 'initiative', resolutions) +
    (passive.initiative ?? 0)
  if (occAmt) parts.push({ label: 'OCC', amount: occAmt })
  if (handToHand?.initiative && hthShort) {
    parts.push({ label: `HtH ${hthShort}`, amount: handToHand.initiative })
  }
  const line = ledgerFromParts(parts)
  return { ...line, label: 'Initiative' }
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
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const { parts, skillEntries } = buildOrderedCombatBonusParts({
    occ,
    specializationId,
    occStatKey: 'rollWithPunch',
    occResolutions: resolutions,
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

/** Dedicated combat block — summed totals with per-source breakdown hints. */
export function buildCreationCombatBlock(
  character: Character,
  activeForm: ActiveForm,
  attrs: CharacterAttributes,
  combat: CreationCombatLedger,
  skillIds: readonly string[],
  level: number,
  passive: FeatureModifiers,
  handToHand?: AccumulatedHandToHandBonuses,
  strengthCapacities?: StrengthCapacities,
  occ?: PalladiumOcc,
  effectivePs?: number,
): CreationLedgerLine[] {
  const hthTier = effectiveCreationHandToHandTier(character, occ)
  const hthId = sheetSkillIdForCreationHandToHandTier(hthTier)
  const hthDef = hthId ? getSkillById(hthId) : undefined
  const hthDisplay = hthLedgerDisplayName(hthDef?.name ?? null, character, occ)
  const hthShort = hthShortLabel(
    hthDef?.name ?? null,
    creationHandToHandTierLabel(hthTier),
  )
  const occResolutions = character.creationOccVariableResolutions ?? {}
  const specId = character.occSpecializationId

  const skill = aggregateSkillPhysicalBonuses(skillIds)
  const hthApm = handToHandAttackBonus(handToHand ?? createEmptyAccumulatedHandToHandBonuses())
  const skillApm = skill.combat.apm ?? 0
  const passiveApm = passive.apm ?? 0

  const entangleParts: SaveDeductionLine[] = []
  if (handToHand?.entangle && hthShort) {
    entangleParts.push({ label: `HtH ${hthShort}`, amount: handToHand.entangle })
  }

  const disarmParts: SaveDeductionLine[] = []
  if (handToHand?.disarm && hthShort) {
    disarmParts.push({ label: `HtH ${hthShort}`, amount: handToHand.disarm })
  }

  const entangleLine = ledgerFromParts(entangleParts)
  const disarmLine = ledgerFromParts(disarmParts)

  const psForDamage = effectivePs ?? attrs.ps.score

  return [
    {
      label: 'Hand to Hand',
      value: hthDisplay ?? LEDGER_NA,
    },
    buildAttacksPerMeleeLine(attrs, level, hthApm, skillApm, passiveApm, hthShort),
    buildCreationInitiativeLine(
      handToHand,
      hthShort,
      passive,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationCombatStatLine(
      'Strike',
      'strike',
      attrs,
      skillIds,
      skill,
      handToHand,
      hthShort,
      passive,
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
      occ,
      specId,
      occResolutions,
    ),
    buildCreationRollLine(
      skillIds,
      skill,
      handToHand,
      hthShort,
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
  attrs: CharacterAttributes
  race: Race | undefined
  occ: PalladiumOcc | undefined
  supportsDualForm: boolean
  psychicTier: string
  activeForm: ActiveForm
  strengthCapacities: StrengthCapacities
  handToHand?: AccumulatedHandToHandBonuses
  horrorFactorTotal?: number | null
}): CreationLiveLedgerSnapshot {
  const skillIds = resolveCreationSkillIds(opts.character, opts.occ)
  const passive = aggregateAllPassiveModifiers(
    opts.character,
    opts.activeForm,
    {},
    opts.occ,
  )

  const horrorFactorTotal =
    opts.horrorFactorTotal ??
    computeHorrorFactorAura(
      opts.character,
      opts.activeForm,
      passive,
      opts.supportsDualForm,
    ).total

  const effectiveAttrs = resolveLedgerEffectiveAttributes(
    opts.attrs,
    opts.character.creationAttributeAssignments,
    opts.race,
    opts.occ,
    opts.character.occSpecializationId,
    skillIds,
    opts.character.creationOccVariableResolutions ?? {},
  )

  const damageCtx: CreationCombatDamageContext = {
    effectivePs: effectiveAttrs.ps.score,
    occ: opts.occ,
    specializationId: opts.character.occSpecializationId,
    occResolutions: opts.character.creationOccVariableResolutions ?? {},
    passive,
  }

  const combatLedger = buildCreationCombatLedger(
    opts.attrs,
    skillIds,
    opts.character.level,
    opts.handToHand,
    opts.strengthCapacities,
    damageCtx,
  )
  const exceptionalSuper = buildCreationExceptionalSuperGroups(effectiveAttrs)

  return {
    attributes: buildCreationAttributeBlock(
      opts.attrs,
      opts.character.creationAttributeAssignments,
      opts.race,
      opts.occ,
      opts.character.occSpecializationId,
      skillIds,
      opts.character.creationOccVariableResolutions ?? {},
    ),
    exceptional: buildCreationExceptionalStandardBlock(effectiveAttrs),
    exceptionalSuper,
    vitals: buildCreationVitalsBlock({
      character: opts.character,
      attrs: opts.attrs,
      race: opts.race,
      occ: opts.occ,
      supportsDualForm: opts.supportsDualForm,
      psychicTier: opts.psychicTier,
      activeForm: opts.activeForm,
      passive,
      horrorFactorTotal,
      skillIds,
    }),
    saves: buildCreationSavesBlock(
      opts.attrs,
      passive,
      opts.character,
      opts.activeForm,
      opts.occ,
    ),
    combat: buildCreationCombatBlock(
      opts.character,
      opts.activeForm,
      opts.attrs,
      combatLedger,
      skillIds,
      opts.character.level,
      passive,
      opts.handToHand,
      opts.strengthCapacities,
      opts.occ,
      effectiveAttrs.ps.score,
    ),
  }
}
