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
import { occAttributeRequirementSuffix } from './creationAttributeSync'
import { occVariableAttributeResolution } from './occVariableBonus'
import {
  buildForgeAttributeStatBonuses,
  buildLedgerTraitDiceGroup,
  buildSdcStatBonusDetails,
  type LedgerFlatContribution,
} from './ledgerStatBonuses'
import {
  buildCreationStatStack,
  buildSaveStatStack,
  facadeAttributeTotalFromStack,
  facadePendingBlocksByAttr,
  pendingBlockHasUnresolvedRolls,
  resolveCombatLedgerTotals,
  resolveExceptionalDisplayValue,
  resolveFacadeAttributeSnapshot,
  statStackToLedgerLines,
  statStackTotal,
  type ExceptionalDisplayKey,
  type CombatStatKey,
} from './creationStatEngine'
import { creationVitalityPreview } from './creationVitalityPreview'
import {
  buildAttrFormulaLedgerFields,
  dualFormPpeLedgerFormulaOpts,
  formatHpDiceRollHint,
  resolveIspCreationFormula,
  resolvePpeCreationFormula,
  resolvePpeFormulaParts,
} from './ledgerVitalFormula'
import { resolveCreationOccSkillIds } from './occCoreSkillVouchers'
import { characterHasDualForms } from './raceFormPolicy'
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
import {
  creationHandToHandTierLabel,
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
  buildCreationLedgerResolutionBundle,
  sumPendingAttributeDiceBonuses,
  pendingAttributeDiceBreakdown,
  morphusTraitAttributeDiceBreakdown,
  creationPendingBlockTotal,
  pendingDiceBlocksById,
  pendingDiceBlockRunningTotal,
  type PendingDiceBlock,
} from './spawnDiceBlocks'
import {
  applyLedgerAttributeScores,
  applyMorphusLedgerDiff,
  applyMorphusLedgerGroupDiff,
  buildMorphusCreationBasePassiveModifiers,
  buildMorphusTraitHorrorFactorDetails,
  buildMorphusTraitSdcBonusDetails,
  creationLedgerSavePassiveModifiers,
  creationLedgerTraitPassiveModifiers,
  morphusAttributeScoresFromLedgerLines,
  morphusTraitPassiveKeyAttribution,
  parseCreationLedgerNumericValue,
  resolveCreationLedgerHandToHandAccumulated,
  strengthCapacitiesFromAttributes,
  effectiveLedgerHandToHandTier,
} from './morphusCreationLedger'
import { buildMorphusPassiveBundle } from './morphusPassiveBridge'
import {
  MORPHUS_HIT_POINTS_FORMULA,
  MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
} from './morphusNightbaneBase'
import type { CreationHandToHandTier } from './creationHandToHandChoice'
import {
  buildCreationLedgerLine,
  buildExceptionalStackLedgerLine,
  buildFlatSourceLedgerLine,
  buildNaturalArmorLedgerLine,
  buildVitalityLedgerLineFromBlock,
  type CreationLedgerLine,
  type CreationLedgerGroup,
  type BuildCreationLedgerLineInput,
} from './ledgerLineBuilder'
import {
  projectFacadeAttributeLine,
  projectMorphusAttributeLine,
  projectStackLine,
  projectVitalityLine,
  resolveStackLedgerRow,
  rowHasPendingDice,
  sumResolvedRowTotal,
  type CreationLedgerResolutionContext,
  type ResolvedLedgerRow,
} from './ledgerRowResolution'
import {
  refreshMorphusAttributeRowsInContext,
  resolveCreationLedgerContext,
} from './resolveCreationLedgerContext'

export type { CreationLedgerLine, CreationLedgerGroup }

export const LEDGER_NA = '—'
/** Default Hand to Hand tier label in the creation ledger. */
export const LEDGER_HTH_NONE = 'None'
/** Unassigned creation attribute pool slot (not yet dragged onto the strip). */
export const LEDGER_UNASSIGNED = '—'

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


function perTraitCombatContributions(
  character: Character,
  passiveKey: string,
  morphusLedger: boolean,
): readonly { name: string; amount: number }[] {
  if (!morphusLedger) return []
  return morphusTraitPassiveKeyAttribution(character, [passiveKey]).map((entry) => ({
    name: entry.label,
    amount: entry.amount,
  }))
}

const STAGING_KEYS = ['sdc', 'ps', 'pp', 'pe', 'spd'] as const

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

function stackRowId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function projectCombatStackLine(input: {
  label: string
  stack: ReturnType<typeof buildCreationStatStack>
  value: string
  valueModified?: boolean
  skillEntries?: readonly { name: string; amount: number }[]
  traitEntries?: readonly { name: string; amount: number }[]
}): CreationLedgerLine {
  const row = resolveStackLedgerRow({
    id: stackRowId(input.label),
    label: input.label,
    section: 'combat',
    stack: input.stack,
    valueDisplay: input.value,
    valueModified: input.valueModified,
  })
  return projectStackLine({
    row,
    stack: input.stack,
    value: input.value,
    tooltipKind: 'stack_combat',
    skillEntries: input.skillEntries,
    traitEntries: input.traitEntries,
  })
}

function combatLedgerLineFromParts(
  label: string,
  parts: readonly SaveDeductionLine[],
  skillEntries: readonly { name: string; amount: number }[] = [],
  stackTerms?: ReturnType<typeof buildCreationStatStack>,
  traitEntries: readonly { name: string; amount: number }[] = [],
): CreationLedgerLine {
  const total = parts.reduce((sum, p) => sum + p.amount, 0)
  if (!stackTerms) {
    return buildCreationLedgerLine({
      label,
      value: total !== 0 ? formatBonus(total) : LEDGER_NA,
      valueModified: total !== 0,
    })
  }
  return projectCombatStackLine({
    label,
    stack: stackTerms,
    value: total !== 0 ? formatBonus(total) : LEDGER_NA,
    valueModified: total !== 0,
    skillEntries,
    traitEntries,
  })
}
type OrderedCombatBonusInput = {
  attrs: CharacterAttributes
  combatKey: CombatStatKey
  occ?: PalladiumOcc
  specializationId?: string | null
  occResolutions?: Readonly<Record<string, number>>
  passiveOcc?: number
  morphusRaceBonus?: number
  hth?: number
  hthShort?: string | null
  skillIds: readonly string[]
  skill: SkillBonusAgg
  skillKey: PhysicalCombatBonusKey
  traitMiscLabel?: string
}

function buildOrderedCombatBonusParts(
  input: OrderedCombatBonusInput,
): {
  parts: SaveDeductionLine[]
  skillEntries: readonly { name: string; amount: number }[]
  stack: ReturnType<typeof buildCreationStatStack>
} {
  const skillAmt = input.skill.combat[input.skillKey] ?? 0
  const skillEntries = perSkillCombatContributions(input.skillIds, input.skillKey)
  const stack = buildCreationStatStack({
    kind: 'combat',
    combatKey: input.combatKey,
    attrs: input.attrs,
    occ: input.occ,
    specializationId: input.specializationId,
    occResolutions: input.occResolutions,
    passiveOcc: input.passiveOcc,
    morphusRaceBonus: input.morphusRaceBonus,
    traitMiscLabel: input.traitMiscLabel,
    hth: input.hth,
    hthLabel: input.hth && input.hthShort ? `HtH ${input.hthShort}` : null,
    skillAmount: skillAmt,
  })
  return { parts: statStackToLedgerLines(stack), skillEntries, stack }
}

function buildMindControlSaveLine(
  passive: FeatureModifiers,
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
  supportsDualForm: boolean,
  race?: Race,
): CreationLedgerLine {
  if (characterHasDualForms(character)) {
    return buildCreationLedgerLine({
      label: 'Mind Control',
      value: 'Immune',
      valueModified: true,
      tooltip: { kind: 'source_attribution', sourceLabel: 'Race', text: 'Immune' },
    })
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
    const stack = buildCreationStatStack({
      kind: 'facade_attribute',
      flatBreakdown: bundle.flatBreakdown,
      occVariableBonus: variableBonus,
      enteredSkillDice: [],
    })
    const stackTotal = facadeAttributeTotalFromStack(poolRoll, stack)
    const total =
      stackTotal != null
        ? stackTotal + pendingBonus
        : pendingBonus > 0
          ? pendingBonus
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
function pendingMorphusAttributeTotals(
  pendingById: Readonly<Record<string, PendingDiceBlock>>,
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, number>> {
  const out: Partial<Record<ForgeAttrKey, number>> = {}
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const total = creationPendingBlockTotal(
      pendingById[`morphus_attr_${attr}`],
      resolutions,
    )
    if (total != null) out[attr] = total
  }
  return out
}

function vitalityLedgerLineFromBlock(
  label: string,
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
  fallback: BuildCreationLedgerLineInput,
): CreationLedgerLine {
  return buildVitalityLedgerLineFromBlock(label, block, resolutions, fallback)
}

export function buildCreationAttributeBlock(
  _attrs: CharacterAttributes,
  assignments: Partial<Record<ForgeAttrKey, number>> = {},
  race?: Race,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  grantedSkillIds: readonly string[] = [],
  _occVariableResolutions: Readonly<Record<string, number>> = {},
  _pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>> = {},
  _pendingAttrDiceBreakdown: Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> = {},
  _pendingAttrBlocks: Partial<Record<ForgeAttrKey, PendingDiceBlock>> = {},
  resolutions: Readonly<Record<string, number>> = {},
  character?: Character,
): CreationLedgerLine[] {
  const char =
    character ??
    ({
      creationAttributeAssignments: assignments,
      occSpecializationId: specializationId,
      creationPendingDiceResolutions: resolutions,
    } as Character)
  const facadeRows = resolveCreationLedgerContext({
    character: char,
    race,
    occ,
    skillIds: grantedSkillIds,
  }).facade.attributes
  return FORGE_ATTRIBUTE_KEYS.map((attr) => {
    let row = facadeRows[attr]!
    if (_pendingAttrDiceBreakdown[attr]?.length) {
      const contributions = [...row.contributions]
      for (const entry of _pendingAttrDiceBreakdown[attr]!) {
        const pendingIdx = contributions.findIndex(
          (c) =>
            c.kind === 'dice_pending' &&
            c.scope === 'facade' &&
            c.label === entry.label,
        )
        if (pendingIdx >= 0) {
          const pending = contributions[pendingIdx]!
          contributions[pendingIdx] = {
            ...pending,
            kind: 'dice_entered',
            resolvedAmount: entry.amount,
            amount: entry.amount,
            notation: undefined,
          }
          continue
        }
        if (
          contributions.some(
            (c) => c.kind === 'dice_entered' && c.label === entry.label,
          )
        ) {
          continue
        }
        contributions.push({
          kind: 'dice_entered',
          scope: 'facade',
          label: entry.label,
          amount: entry.amount,
          resolvedAmount: entry.amount,
        })
      }
      row = {
        ...row,
        contributions,
        total: sumResolvedRowTotal(
          { ...row, contributions } as ResolvedLedgerRow,
          ['facade'],
        ),
        valueModified: true,
      }
    }
    const pendingBlock = _pendingAttrBlocks[attr]
    const hasPendingRolls =
      pendingBlock != null
        ? pendingBlockHasUnresolvedRolls(pendingBlock, resolutions)
        : _pendingAttrDiceBreakdown[attr]?.length
          ? false
          : rowHasPendingDice(row, resolutions)
    const line = projectFacadeAttributeLine(row, {
      resolutions,
      unassignedValue: LEDGER_UNASSIGNED,
      hasPendingRolls,
    })
    const suffix = occAttributeRequirementSuffix(occ, attr, specializationId)
    return suffix ? { ...line, labelSuffix: suffix } : line
  })
}

/** Exceptional attribute perks (17–30 table range) shown outside Save vs / Combat blocks. */
function exceptionalAttributeLine(
  label: string,
  key: ExceptionalDisplayKey,
  attrs: CharacterAttributes,
  morphusAttributeRollBonuses?: MorphusAttributeRollBonuses,
  format: 'bonus' | 'percent' = 'bonus',
): CreationLedgerLine {
  const stack = buildCreationStatStack({
    kind: 'exceptional',
    key,
    attrs,
    morphusRollBonuses: morphusAttributeRollBonuses,
  })
  const total = statStackTotal(stack)
  const value = format === 'percent' ? ledgerPercent(total) : ledgerBonus(total)
  return buildExceptionalStackLedgerLine({
    label,
    stack,
    value,
    valueModified: total !== 0,
  })
}

export function buildCreationExceptionalStandardBlock(
  attrs: CharacterAttributes,
  morphusAttributeRollBonuses?: MorphusAttributeRollBonuses,
): CreationLedgerLine[] {
  return [
    exceptionalAttributeLine(
      'I.Q. skill bonus',
      'iq_skill',
      attrs,
      morphusAttributeRollBonuses,
      'percent',
    ),
    exceptionalAttributeLine(
      'I.Q. perception bonus',
      'iq_perception',
      attrs,
      morphusAttributeRollBonuses,
    ),
    exceptionalAttributeLine(
      'M.E. save vs psionic / insanity',
      'me_save',
      attrs,
      morphusAttributeRollBonuses,
    ),
    exceptionalAttributeLine(
      'M.A. trust / intimidate',
      'ma_trust',
      attrs,
      morphusAttributeRollBonuses,
      'percent',
    ),
    exceptionalAttributeLine(
      'P.S. HtH combat damage',
      'ps_damage',
      attrs,
      morphusAttributeRollBonuses,
    ),
    exceptionalAttributeLine(
      'P.P. strike / parry / dodge',
      'pp_combat',
      attrs,
      morphusAttributeRollBonuses,
    ),
    exceptionalAttributeLine(
      'P.E. save vs magic / poisons',
      'pe_save',
      attrs,
      morphusAttributeRollBonuses,
    ),
    exceptionalAttributeLine(
      'P.E. save vs coma / death',
      'pe_coma_death',
      attrs,
      morphusAttributeRollBonuses,
      'percent',
    ),
    exceptionalAttributeLine(
      'P.B. charm / impress',
      'pb_charm',
      attrs,
      morphusAttributeRollBonuses,
      'percent',
    ),
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
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'I.Q. skill bonus',
          value: ledgerPercent(iq.skillBonusSuper),
          sourceLabel: 'I.Q. (31+)',
          amount: iq.skillBonusSuper,
        }),
      )
    }
    if (iq.perceptionSuper > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'I.Q. perception bonus',
          value: ledgerBonus(iq.perceptionSuper),
          sourceLabel: 'I.Q. (31+)',
          amount: iq.perceptionSuper,
        }),
      )
    }
    if (iq.saveIllusion > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'I.Q. save vs illusions',
          value: ledgerBonus(iq.saveIllusion),
          sourceLabel: 'I.Q. (31+)',
          amount: iq.saveIllusion,
        }),
      )
    }
    if (lines.length > 0) groups.push({ title: 'I.Q. (31+)', lines })
  }

  if (attrs.me > 30) {
    const me = getMeBonuses(attrs.me)
    const lines: CreationLedgerLine[] = []
    if (me.savePossessionSuper > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'M.E. save vs possession',
          value: ledgerBonus(me.savePossessionSuper),
          sourceLabel: 'M.E. (31+)',
          amount: me.savePossessionSuper,
        }),
      )
    }
    if (lines.length > 0) groups.push({ title: 'M.E. (31+)', lines })
  }

  if (attrs.ma > 30) {
    const ma = getMaBonuses(attrs.ma)
    const lines: CreationLedgerLine[] = []
    if (ma.perceptionPenaltyToOthers > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'M.A. perception penalty (others)',
          value: ledgerBonus(ma.perceptionPenaltyToOthers),
          sourceLabel: 'M.A. (31+)',
          amount: ma.perceptionPenaltyToOthers,
        }),
      )
    }
    for (const [skill, bonus] of Object.entries(ma.specificSkillBonuses)) {
      if (bonus === 0) continue
      lines.push(
        buildFlatSourceLedgerLine({
          label: `M.A. ${skill}`,
          value: ledgerPercent(bonus),
          sourceLabel: 'M.A. (31+)',
          amount: bonus,
        }),
      )
    }
    if (lines.length > 0) groups.push({ title: 'M.A. (31+)', lines })
  }

  if (attrs.ps.score > 30) {
    const ps = getPsBonuses(attrs.ps.score)
    const lines: CreationLedgerLine[] = []
    if (ps.throwRangeSuper > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'P.S. throw range',
          value: `+${ps.throwRangeSuper} ft`,
          sourceLabel: 'P.S. (31+)',
          amount: ps.throwRangeSuper,
        }),
      )
    }
    if (ps.liftCarrySuper > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'P.S. lift / carry',
          value: ledgerPercent(ps.liftCarrySuper),
          sourceLabel: 'P.S. (31+)',
          amount: ps.liftCarrySuper,
        }),
      )
    }
    if (lines.length > 0) groups.push({ title: 'P.S. (31+)', lines })
  }

  if (attrs.pp > 30) {
    const pp = getPpBonuses(attrs.pp)
    const lines: CreationLedgerLine[] = []
    if (pp.initiativeSuper > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'P.P. initiative',
          value: ledgerBonus(pp.initiativeSuper),
          sourceLabel: 'P.P. (31+)',
          amount: pp.initiativeSuper,
        }),
      )
    }
    if (lines.length > 0) groups.push({ title: 'P.P. (31+)', lines })
  }

  if (attrs.pe > 30) {
    const pe = getPeBonuses(attrs.pe)
    const lines: CreationLedgerLine[] = []
    if (pe.comaDeathSuper > 0) {
      lines.push(
        buildFlatSourceLedgerLine({
          label: 'P.E. save vs coma / death',
          value: ledgerPercent(pe.comaDeathSuper),
          sourceLabel: 'P.E. (31+)',
          amount: pe.comaDeathSuper,
        }),
      )
    }
    if (pe.halfFatigue) {
      lines.push(
        buildCreationLedgerLine({
          label: 'P.E. fatigue rate',
          value: '½ rate',
          hint: 'P.E. (31+)',
        }),
      )
    }
    if (pe.imperviousDisease) {
      lines.push(
        buildCreationLedgerLine({
          label: 'P.E. disease',
          value: 'Impervious',
          hint: 'P.E. (31+)',
        }),
      )
    }
    if (lines.length > 0) groups.push({ title: 'P.E. (31+)', lines })
  }

  if (attrs.pb > 30) {
    const pb = getPbBonuses(attrs.pb)
    const lines: CreationLedgerLine[] = []
    for (const [skill, bonus] of Object.entries(pb.specificSkillBonuses)) {
      if (bonus === 0) continue
      lines.push(
        buildFlatSourceLedgerLine({
          label: `P.B. ${skill}`,
          value: ledgerPercent(bonus),
          sourceLabel: 'P.B. (31+)',
          amount: bonus,
        }),
      )
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
  /** Pre-built pending dice blocks — single source of truth with Review tab. */
  pendingBlocks?: readonly PendingDiceBlock[]
  /** Canonical vitality rows from {@link buildCreationLedgerResolutionBundle}. */
  ledgerContext?: CreationLedgerResolutionContext
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
  const pendingBlocks =
    opts.pendingBlocks ??
    buildPendingDiceBlocks(opts.character, opts.race, opts.occ, {
      supportsDualForm: opts.supportsDualForm,
      psychicTier: opts.psychicTier,
    })
  const pendingById = pendingDiceBlocksById(pendingBlocks)
  const facadeVitals = opts.ledgerContext?.facade.vitals ?? {}
  const morphusVitals = opts.ledgerContext?.morphus.vitals ?? {}

  const projectVital = (
    row: ResolvedLedgerRow | undefined,
    blockId: string,
    fallback: Parameters<typeof vitalityLedgerLineFromBlock>[3],
  ): CreationLedgerLine => {
    if (row) {
      return projectVitalityLine(row, {
        resolutions,
        pendingBlock: pendingById[blockId],
      })
    }
    return vitalityLedgerLineFromBlock(fallback.label, pendingById[blockId], resolutions, fallback)
  }

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

  const sdcDetails = facadeVitals.sdc
    ? null
    : buildSdcStatBonusDetails(
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
  const traitHf = morphusLedger
    ? buildMorphusTraitHorrorFactorDetails(opts.character)
    : { flatTotal: 0, flatBreakdown: [], diceContributions: [] }
  const hfDiceGroup = buildLedgerTraitDiceGroup(traitHf.diceContributions)
  const morphusHfBlock = morphusLedger ? pendingById.morphus_hf : undefined
  const hfPendingTotal = creationPendingBlockTotal(morphusHfBlock, resolutions)
  const hfDisplayTotal =
    hfPendingTotal ??
    (opts.horrorFactorProfile.total != null && opts.horrorFactorProfile.total > 0
      ? opts.horrorFactorProfile.total
      : null)

  const morphusPeScore = opts.attrs.pe
  const hpLine = morphusLedger
    ? projectVital(morphusVitals.morphus_hp, 'morphus_hp', {
        label: 'H.P.',
        ...buildAttrFormulaLedgerFields(MORPHUS_HIT_POINTS_FORMULA, assignments, {
          hintOverride: formatHpDiceRollHint(
            MORPHUS_HIT_POINTS_FORMULA,
            MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
          ),
          attrScores: { pe: morphusPeScore },
          formulaSources: { race: MORPHUS_HIT_POINTS_FORMULA },
        }),
      })
    : projectVital(facadeVitals.hp, 'hp', {
        label: 'H.P.',
        ...hpFields,
      })

  const morphusFacadeSdc =
    pendingById.sdc != null
      ? pendingDiceBlockRunningTotal(pendingById.sdc, resolutions)
      : facadeVitals.sdc?.pendingFlatBaseline ?? sdcDetails?.flatTotal ?? 0

  const sdcLine = morphusLedger
    ? projectVital(morphusVitals.morphus_sdc, 'morphus_sdc', {
        label: 'S.D.C.',
        value: preview.primarySdcValue,
        valueModified:
          traitSdc.diceContributions.length > 0 ||
          traitSdc.flatTotal > 0 ||
          (pendingById.morphus_sdc?.flatBaseline ?? 0) > 0,
        morphusFacadeSdc,
        skillFlatTerms: traitSdc.flatBreakdown,
        flatTerms: [],
      })
    : projectVital(facadeVitals.sdc, 'sdc', {
        label: 'S.D.C.',
        value:
          (facadeVitals.sdc?.pendingFlatBaseline ?? sdcDetails?.flatTotal ?? 0) > 0
            ? String(facadeVitals.sdc?.pendingFlatBaseline ?? sdcDetails!.flatTotal)
            : preview.primarySdcValue,
        valueModified:
          (facadeVitals.sdc?.pendingFlatBaseline ?? sdcDetails?.flatTotal ?? 0) > 0,
        flatTerms: sdcDetails?.flatVitalTerms,
        skillFlatTerms: sdcDetails?.skillFlats,
        diceGroups:
          sdcDetails && sdcDetails.diceGroups.length > 0
            ? sdcDetails.diceGroups
            : undefined,
      })

  const lines: CreationLedgerLine[] = [
    hpLine,
    sdcLine,
    projectVital(facadeVitals.ppe, 'ppe', {
      label: 'P.P.E.',
      ...ppeFields,
    }),
    showIsp && ispFields
      ? projectVital(facadeVitals.isp, 'isp', {
          label: 'I.S.P.',
          ...ispFields,
        })
      : buildCreationLedgerLine({ label: 'I.S.P.', value: LEDGER_NA, tooltip: { kind: 'none' } }),
    buildCreationLedgerLine({
      label: 'H.F.',
      value: hfDisplayTotal != null && hfDisplayTotal > 0 ? String(hfDisplayTotal) : LEDGER_NA,
      valueModified:
        hfDisplayTotal != null ||
        (opts.horrorFactorProfile.contributions?.length ?? 0) > 0 ||
        hfDiceGroup != null,
      diceGroups: hfDiceGroup ? [hfDiceGroup] : undefined,
      pendingBlock: morphusHfBlock,
      resolutions,
      tooltip: {
        kind: 'horror_factor',
        profile: opts.horrorFactorProfile,
        traitFlatBreakdown: traitHf.flatBreakdown,
        pendingRolls: pendingBlockHasUnresolvedRolls(morphusHfBlock, resolutions),
      },
    }),
    buildNaturalArmorLedgerLine(
      'Natural A.R.',
      buildCreationStatStack({ kind: 'natural_armor', passive: opts.passive }),
    ),
  ]

  return lines
}

function exceptionalSaveParts(
  key: ExceptionalDisplayKey,
  label: string,
  attrs: CharacterAttributes,
): SaveDeductionLine[] {
  const amount = resolveExceptionalDisplayValue(key, attrs)
  return amount ? [{ label, amount }] : []
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
  const exceptionalPart = parts.find(
    (part) =>
      part.label === 'P.E.' ||
      part.label === 'M.E.' ||
      part.label === 'I.Q. (31+)' ||
      part.label.startsWith('P.E.') ||
      part.label.startsWith('M.E.'),
  )
  const stack = buildSaveStatStack({
    exceptional: exceptionalPart
      ? { label: exceptionalPart.label, amount: exceptionalPart.amount }
      : null,
    occParts: parts.filter((part) => part.label === 'O.C.C.'),
    attributionParts: attrLines,
  })
  const total = statStackTotal(stack)
  const row = resolveStackLedgerRow({
    id: stackRowId(label),
    label,
    section: 'save',
    stack,
    valueDisplay: ledgerBonus(total),
    valueModified: total !== 0,
  })
  return projectStackLine({
    row,
    stack,
    value: ledgerBonus(total),
    tooltipKind: 'stack_save',
  })
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
        ...exceptionalSaveParts('pe_save_magic', 'P.E.', attrs),
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
        ...exceptionalSaveParts('me_save_psionics', 'M.E.', attrs),
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
      resolveExceptionalDisplayValue('iq_save_illusion', attrs) > 0
        ? [
            {
              label: 'I.Q. (31+)',
              amount: resolveExceptionalDisplayValue('iq_save_illusion', attrs),
            },
          ]
        : [],
      character,
      activeForm,
      illusionKeys,
      passive,
      supportsDualForm,
      race,
    ),
    pe.imperviousDisease
      ?         buildCreationLedgerLine({
          label: 'Disease',
          value: 'Impervious',
          labelTooltip: 'P.E. 30+ — immune to disease; no save required.',
        })
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
      exceptionalSaveParts('me_save_insanity', 'M.E.', attrs),
      character,
      activeForm,
      ['save_insanity'],
      passive,
      supportsDualForm,
      race,
    ),
    saveLineWithAttribution(
      'Poison / Toxins',
      exceptionalSaveParts('pe_save_poison', 'P.E.', attrs),
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
        ...exceptionalSaveParts('me_save_possession', 'M.E. (31+)', attrs),
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
    (() => {
      const comaBreakdown: LedgerFlatContribution[] = []
      if (pe.comaDeathStandard > 0) {
        comaBreakdown.push({
          label: 'P.E. (17–30)',
          amount: pe.comaDeathStandard,
        })
      }
      if (pe.comaDeathSuper > 0) {
        comaBreakdown.push({
          label: 'P.E. (31+)',
          amount: pe.comaDeathSuper,
        })
      }
      return buildCreationLedgerLine({
        label: 'Coma / Death',
        value: ledgerPercent(pe.comaDeathPercent),
        valueModified: pe.comaDeathPercent > 0,
        tooltip:
          comaBreakdown.length > 0
            ? { kind: 'stack_flat', breakdown: comaBreakdown }
            : undefined,
      })
    })(),
    ...computeAttributeSaveProfile(attrs.pe, attrs.me, character.level, supportsDualForm, {
      primaryMe,
    }).map((row) =>
      buildCreationLedgerLine({
        label: row.sheetLabel,
        labelTooltip: row.notes,
        value:
          row.totalRollBonus != null && row.totalRollBonus !== 0
            ? ledgerBonus(row.totalRollBonus)
            : '—',
        valueModified: (row.totalRollBonus ?? 0) !== 0,
        tooltip:
          row.rollBonuses.length > 0
            ? {
                kind: 'stack_flat',
                breakdown: row.rollBonuses.map((bonus) => ({
                  label: bonus.label,
                  amount: bonus.amount,
                })),
              }
            : undefined,
      }),
    ),
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
  const skill = aggregateSkillPhysicalBonuses(skillIds)
  const hth = handToHand ?? createEmptyAccumulatedHandToHandBonuses()
  const totals = resolveCombatLedgerTotals({
    attrs,
    skillAmounts: {
      strike: skill.combat.strike ?? 0,
      parry: skill.combat.parry ?? 0,
      dodge: skill.combat.dodge ?? 0,
      rollWithImpact: skill.combat.rollWithImpact ?? 0,
      pullPunch: skill.combat.pullPunch ?? 0,
    },
    handToHand: hth,
    effectivePs: damageCtx?.effectivePs,
    occ: damageCtx?.occ,
    specializationId: damageCtx?.specializationId,
    occResolutions: damageCtx?.occResolutions,
    passive: damageCtx?.passive,
  })

  let handToHandDamage = totals.handToHandDamage
  if (strengthCapacities?.handToHandDamage.kind === 'supernatural') {
    handToHandDamage = 0
  }

  return {
    strike: totals.strike,
    parry: totals.parry,
    dodge: totals.dodge,
    rollWithPunchFallImpact: totals.rollWithPunchFallImpact,
    pullPunch: totals.pullPunch,
    initiative: hth.initiative,
    attacksPerMelee:
      computeMaxApm(attrs, level, handToHandAttackBonus(hth)) + (skill.combat.apm ?? 0),
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
  const modifierStack = buildCreationStatStack({
    kind: 'apm_modifiers',
    hthApm: hthAttackBonus,
    hthLabel: hthLabel ? `HtH ${hthLabel}` : null,
    skillApm,
    morphusRaceApm: baseApm,
    traitApm,
  })
  return buildCreationLedgerLine({
    label: 'Attacks / melee',
    value: ledgerCount(stack.total),
    valueModified: stack.total !== 2,
    tooltip: { kind: 'apm', terms: modifierStack },
  })
}

function buildCreationPerceptionLine(
  attrs: CharacterAttributes,
  passive: FeatureModifiers,
  morphusBase: FeatureModifiers,
  character: Character,
  morphusLedger: boolean,
): CreationLedgerLine {
  const stack = buildCreationStatStack({
    kind: 'combat',
    combatKey: 'perception',
    attrs,
    morphusRaceBonus: morphusBase.perception ?? 0,
    traitMisc: passive.perception ?? 0,
    traitMiscLabel: 'Features',
  })
  return combatLedgerLineFromParts(
    'Perception',
    statStackToLedgerLines(stack),
    [],
    stack,
    perTraitCombatContributions(character, 'perception', morphusLedger),
  )
}

function buildCreationInitiativeLine(
  attrs: CharacterAttributes,
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  passive: FeatureModifiers,
  morphusBase: FeatureModifiers,
  character: Character,
  morphusLedger: boolean,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const stack = buildCreationStatStack({
    kind: 'combat',
    combatKey: 'initiative',
    attrs,
    occ,
    specializationId,
    occResolutions: resolutions,
    morphusRaceBonus: morphusBase.initiative ?? 0,
    traitMisc: passive.initiative ?? 0,
    traitMiscLabel: 'Features',
    hth: handToHand?.initiative,
    hthLabel: handToHand?.initiative && hthShort ? `HtH ${hthShort}` : null,
  })
  return combatLedgerLineFromParts(
    'Initiative',
    statStackToLedgerLines(stack),
    [],
    stack,
    perTraitCombatContributions(character, 'initiative', morphusLedger),
  )
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
  character: Character,
  morphusLedger: boolean,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const { parts, skillEntries, stack } = buildOrderedCombatBonusParts({
    attrs,
    combatKey: statKey,
    occ,
    specializationId,
    occResolutions: resolutions,
    passiveOcc: passive[statKey] ?? 0,
    morphusRaceBonus: morphusBase[statKey] ?? 0,
    hth: handToHand?.[statKey] ?? 0,
    hthShort,
    skillIds,
    skill,
    skillKey: statKey,
    traitMiscLabel: 'Features',
  })
  return combatLedgerLineFromParts(
    label,
    parts,
    skillEntries,
    stack,
    perTraitCombatContributions(character, statKey, morphusLedger),
  )
}

function buildCreationRollLine(
  attrs: CharacterAttributes,
  skillIds: readonly string[],
  skill: SkillBonusAgg,
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  morphusBase: FeatureModifiers,
  character: Character,
  morphusLedger: boolean,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const { parts, skillEntries, stack } = buildOrderedCombatBonusParts({
    attrs,
    combatKey: 'rollWithImpact',
    occ,
    specializationId,
    occResolutions: resolutions,
    morphusRaceBonus: morphusBase.rollWithPunch ?? 0,
    hth: handToHand?.rollWithPunch ?? 0,
    hthShort,
    skillIds,
    skill,
    skillKey: 'rollWithImpact',
    traitMiscLabel: 'Features',
  })
  return combatLedgerLineFromParts(
    'Roll w/ punch, fall, impact',
    parts,
    skillEntries,
    stack,
    perTraitCombatContributions(character, 'rollWithImpact', morphusLedger),
  )
}

function buildCreationPullPunchLine(
  attrs: CharacterAttributes,
  skillIds: readonly string[],
  skill: SkillBonusAgg,
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  character: Character,
  morphusLedger: boolean,
  occ?: PalladiumOcc,
  specializationId?: string | null,
  resolutions: Readonly<Record<string, number>> = {},
): CreationLedgerLine {
  const { parts, skillEntries, stack } = buildOrderedCombatBonusParts({
    attrs,
    combatKey: 'pullPunch',
    occ,
    specializationId,
    occResolutions: resolutions,
    hth: handToHand?.pullPunch ?? 0,
    hthShort,
    skillIds,
    skill,
    skillKey: 'pullPunch',
    traitMiscLabel: 'Features',
  })
  return combatLedgerLineFromParts(
    'Pull punch',
    parts,
    skillEntries,
    stack,
    perTraitCombatContributions(character, 'pullPunch', morphusLedger),
  )
}

function buildHandToHandDamageLine(
  combat: CreationCombatLedger,
  damageCtx: CreationCombatDamageContext | undefined,
  effectivePs: number,
  attrs: CharacterAttributes,
  handToHand?: AccumulatedHandToHandBonuses,
  strengthCapacities?: StrengthCapacities,
): CreationLedgerLine {
  if (strengthCapacities?.handToHandDamage.kind === 'supernatural') {
    const d = strengthCapacities.handToHandDamage
    return buildCreationLedgerLine({
      label: 'Hand-to-hand damage (P.S.)',
      value: d.fullStrengthPunch,
      tooltip: {
        kind: 'supernatural_damage',
        restrained: d.restrainedPunch,
        power: d.powerPunch,
      },
    })
  }

  const damageAttrs = {
    ...attrs,
    ps: { ...attrs.ps, score: effectivePs },
  }
  const stack = buildCreationStatStack({
    kind: 'combat',
    combatKey: 'damage',
    attrs: damageAttrs,
    occ: damageCtx?.occ,
    specializationId: damageCtx?.specializationId,
    occResolutions: damageCtx?.occResolutions,
    passiveOcc: damageCtx?.passive?.bonusHthDamage ?? 0,
    hth: handToHand?.damage,
    hthLabel: handToHand?.damage ? 'Hand-to-hand' : null,
  })
  return projectCombatStackLine({
    label: 'Hand-to-hand damage (P.S.)',
    stack,
    value:
      combat.handToHandDamage !== 0
        ? formatBonus(combat.handToHandDamage)
        : LEDGER_NA,
    valueModified: combat.handToHandDamage !== 0,
  })
}

function buildCreationEntangleLine(
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  morphusBase: FeatureModifiers,
  passive: FeatureModifiers,
  character: Character,
  morphusLedger: boolean,
): CreationLedgerLine {
  if (!handToHand?.entangleUnlocked) {
    return buildCreationLedgerLine({ label: 'Entangle', value: LEDGER_NA })
  }

  const stack = buildCreationStatStack({
    kind: 'maneuver',
    maneuver: 'entangle',
    morphusRaceBonus: morphusBase.entangle ?? 0,
    traitBonus: passive.entangle ?? 0,
    hth: handToHand.entangle,
    hthLabel: handToHand.entangle && hthShort ? `HtH ${hthShort}` : null,
  })
  const total = statStackTotal(stack)
  const traitEntries = perTraitCombatContributions(character, 'entangle', morphusLedger)
  return projectCombatStackLine({
    label: 'Entangle',
    stack,
    value: formatBonus(total),
    valueModified: true,
    traitEntries,
  })
}

/** Disarm row — maneuver gated; numeric bonuses apply only when unlocked. */
function buildCreationDisarmLine(
  handToHand: AccumulatedHandToHandBonuses | undefined,
  hthShort: string | null,
  morphusBase: FeatureModifiers,
  passive: FeatureModifiers,
  character: Character,
  morphusLedger: boolean,
): CreationLedgerLine {
  if (!handToHand?.disarmUnlocked) {
    return buildCreationLedgerLine({ label: 'Disarm', value: LEDGER_NA })
  }

  const stack = buildCreationStatStack({
    kind: 'maneuver',
    maneuver: 'disarm',
    morphusRaceBonus: morphusBase.disarm ?? 0,
    traitBonus: passive.disarm ?? 0,
    hth: handToHand.disarm,
    hthLabel: handToHand.disarm && hthShort ? `HtH ${hthShort}` : null,
  })
  const total = statStackTotal(stack)
  const traitEntries = perTraitCombatContributions(character, 'disarm', morphusLedger)
  return projectCombatStackLine({
    label: 'Disarm',
    stack,
    value: formatBonus(total),
    valueModified: true,
    traitEntries,
  })
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
  const morphusLedger = supportsDualForm && activeForm === 'morphus'

  const entangleLine = buildCreationEntangleLine(
    handToHand,
    hthShort,
    morphusBase,
    passive,
    character,
    morphusLedger,
  )
  const disarmLine = buildCreationDisarmLine(
    handToHand,
    hthShort,
    morphusBase,
    passive,
    character,
    morphusLedger,
  )

  const psForDamage = effectivePs ?? attrs.ps.score

  return [
    buildCreationLedgerLine({
      label: 'Hand to Hand',
      value: hthDisplay,
    }),
    buildAttacksPerMeleeLine(attrs, level, hthApm, skillApm, traitApm, baseApm, hthShort),
    buildCreationInitiativeLine(
      attrs,
      handToHand,
      hthShort,
      passive,
      morphusBase,
      character,
      morphusLedger,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationPerceptionLine(attrs, passive, morphusBase, character, morphusLedger),
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
      character,
      morphusLedger,
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
      character,
      morphusLedger,
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
      character,
      morphusLedger,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationRollLine(
      attrs,
      skillIds,
      skill,
      handToHand,
      hthShort,
      morphusBase,
      character,
      morphusLedger,
      occ,
      specId,
      occResolutions,
    ),
    buildCreationPullPunchLine(
      attrs,
      skillIds,
      skill,
      handToHand,
      hthShort,
      character,
      morphusLedger,
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
      attrs,
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
      lines.push(
        buildCreationLedgerLine({
          label: key.toUpperCase(),
          value: formatBonus(amt),
          hint: src ? `On Spawn: ${src}` : 'Applied on Spawn',
          tooltip: { kind: 'none' },
        }),
      )
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
      pendingDiceLines.push(
        buildCreationLedgerLine({
          label: `${name} — ${key.toUpperCase()}`,
          value: raw,
          hint: `${bounds.min}–${bounds.max} at Spawn`,
          tooltip: { kind: 'none' },
        }),
      )
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
  const resolutions = opts.character.creationPendingDiceResolutions ?? {}
  let ledgerContext = buildCreationLedgerResolutionBundle(
    opts.character,
    opts.race,
    opts.occ,
    {
      supportsDualForm: opts.supportsDualForm,
      psychicTier: opts.psychicTier,
    },
  )
  let pendingBlocks = ledgerContext.pendingBlocks
  const pendingAttrBonuses = sumPendingAttributeDiceBonuses(
    pendingBlocks,
    resolutions,
  )
  const pendingAttrDiceBreakdown = pendingAttributeDiceBreakdown(
    pendingBlocks,
    resolutions,
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

  const pendingById = pendingDiceBlocksById(pendingBlocks)
  const facadePendingAttrBlocks = facadePendingBlocksByAttr(pendingById)

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
    facadePendingAttrBlocks,
    resolutions,
    opts.character,
  )

  const morphusLedger =
    opts.activeForm === 'morphus' && opts.supportsDualForm === true

  const pendingMorphusAttrTotals = morphusLedger
    ? pendingMorphusAttributeTotals(pendingById, resolutions)
    : {}

  const attributeLines = morphusLedger
    ? (() => {
        ledgerContext = refreshMorphusAttributeRowsInContext(
          ledgerContext,
          opts.character,
          skillIds,
          pendingMorphusAttrTotals,
        )
        pendingBlocks = ledgerContext.pendingBlocks
        const morphusRows = ledgerContext.morphus.attributes
        return FORGE_ATTRIBUTE_KEYS.map((attr, index) => {
          const morphusRow = morphusRows[attr]
          const primaryLine = primaryAttributeLines[index]!
          if (!morphusRow) return primaryLine
          return projectMorphusAttributeLine(
            morphusRow,
            parseCreationLedgerNumericValue(primaryLine.value),
            {
              resolutions,
              facadeValueTooltip: primaryLine.valueTooltip,
            },
          )
        })
      })()
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
        pendingBlocks,
        ledgerContext,
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
    exceptional: applyMorphusLedgerDiff(
      morphusSections.exceptional,
      primarySections.exceptional,
      'facade_relative',
    ),
    exceptionalSuper: applyMorphusLedgerGroupDiff(
      morphusSections.exceptionalSuper,
      primarySections.exceptionalSuper,
      'facade_relative',
    ),
    vitals: applyMorphusLedgerDiff(
      morphusSections.vitals,
      primarySections.vitals,
      'facade_relative',
    ),
    saves: applyMorphusLedgerDiff(
      morphusSections.saves,
      primarySections.saves,
      'none',
    ),
    combat: applyMorphusLedgerDiff(
      morphusSections.combat,
      primarySections.combat,
      'combat',
    ),
  }
}
