import type {
  AccumulatedHandToHandBonuses,
  ActiveForm,
  Character,
  CharacterAttributes,
  FeatureModifiers,
  MorphusCharacteristic,
  MorphusPolymorphicModifier,
  MorphusStatModifiers,
  PalladiumOcc,
} from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import {
  collectMorphusStatModifierBlocks,
  aggregateMorphusSaveBonuses,
} from './morphusCharacteristicAggregation'
import { morphusStatKeysForPassiveKey, resolveActiveMorphusTraits } from './morphusPassiveBridge'
import {
  collectMorphusAttributeMinFloor,
  morphusCreationPreviewResolveOptions,
  polymorphicFlatOnlyDeltaFromBase,
  applyMorphusAttributeMinFloor,
} from './morphusPolymorphicResolver'
import { parsePhysicalDiceRoll } from './diceNotation'
import type { PendingDiceBlock } from './spawnDiceBlocks'
import { pendingBlockHasUnresolvedRolls } from './creationStatEngine'
import {
  buildCreationLedgerLine,
  formatLedgerTooltip,
} from './ledgerLineBuilder'
import {
  NIGHTBANE_MORPHUS_BASE_PROFILE,
  type NightbaneMorphusBaseProfile,
} from './morphusNightbaneBase'

/** Ledger tooltip bucket for Nightbane Morphus innate package (`stat_engine_spec.md` Race / mBase). */
export const MORPHUS_LEDGER_RACE_LABEL = 'Race'
import type {
  LedgerDiceContribution,
  LedgerFlatContribution,
  LedgerStatDiceGroup,
} from './ledgerStatBonuses'
import { buildForgeAttributeStatBonusDetails, buildLedgerTraitDiceGroup } from './ledgerStatBonuses'
import {
  type CreationHandToHandTier,
  effectiveCreationHandToHandTier,
  handToHandCatalogIdForCreationTier,
} from './creationHandToHandChoice'
import { getHandToHandSkillById } from '../data/library/handToHandCatalogLoader'
import {
  accumulateHandToHandBonuses,
  createEmptyAccumulatedHandToHandBonuses,
} from '../utils/combatCalculator'
import { evaluateStrengthFromPhysicalStat } from '../utils/strengthCalculator'
import { aggregateAllPassiveModifiers } from './featureEngine'
import { buildMorphusPassiveBundle, MORPHUS_STAT_TO_PASSIVE } from './morphusPassiveBridge'

const LEDGER_NA = '—'
const LEDGER_UNASSIGNED = '—'

export type MorphusDiffLedgerLine = {
  label: string
  value: string
  hint?: string
  valueModified?: boolean
  valueTooltip?: string
  skillDetailTooltip?: string
  inlineRaceRoll?: string
  labelSuffix?: string
  diceGroups?: LedgerStatDiceGroup[]
}

export type MorphusDiffLedgerGroup = {
  title: string
  lines: MorphusDiffLedgerLine[]
}
export type MorphusAttributeLedgerLine = {
  label: string
  value: string
  inlineRaceRoll?: string
  labelSuffix?: string
  diceGroups?: LedgerStatDiceGroup[]
  valueModified?: boolean
  valueTooltip?: string
  hasPendingRolls?: boolean
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

const LABEL_TO_ATTR: Record<string, ForgeAttrKey> = Object.fromEntries(
  Object.entries(ATTR_LEDGER_LABELS).map(([attr, label]) => [label, attr as ForgeAttrKey]),
) as Record<string, ForgeAttrKey>

export function parseCreationLedgerNumericValue(value: string): number | null {
  if (value === LEDGER_UNASSIGNED || value === LEDGER_NA) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Morphus attribute tooltip — Facade total plus each Morphus-only delta (non-zero terms only). */
export function formatMorphusVsPrimaryTooltip(
  primaryTotal: number,
  morphusDeltas: readonly LedgerFlatContribution[],
  pendingRolls = false,
): string | undefined {
  return formatLedgerTooltip({
    kind: 'morphus_relative',
    facadeTotal: primaryTotal,
    deltas: morphusDeltas,
    pendingRolls,
  })
}

/** Flat bundled in a dice string (e.g. +4 in `1D6+4`) when not already an explicit `flat` field. */
function modifierFlatFromDiceString(mod: MorphusPolymorphicModifier): number {
  if (!mod.dice?.trim()) return 0
  const fromDice = parsePhysicalDiceRoll(mod.dice.trim()).flatBonus
  if (fromDice === 0) return 0
  if (typeof mod.flat === 'number' && mod.flat !== 0) return 0
  return fromDice
}

/** Skill IDs granted by Morphus traits but not selected on the Facade skill program. */
export function collectMorphusExclusiveSkillIds(
  character: Pick<
    Character,
    | 'activeMorphusCharacteristicIds'
    | 'morphusTraitSlotResolutions'
    | 'morphusForgeState'
    | 'morphus'
  >,
  facadeSkillIds: readonly string[],
): string[] {
  const facadeSet = new Set(facadeSkillIds)
  const exclusive = new Set<string>()
  for (const trait of resolveActiveMorphusTraits(character)) {
    for (const item of trait.gimmickInventory ?? []) {
      for (const grant of item.skillGrants ?? []) {
        if (grant.targetType !== 'skill_id') continue
        const skillId = grant.targetValue?.trim()
        if (!skillId || facadeSet.has(skillId)) continue
        exclusive.add(skillId)
      }
    }
  }
  return [...exclusive]
}

function primaryDiceGroupsForMorphusLedger(
  primaryGroups: readonly LedgerStatDiceGroup[] | undefined,
): LedgerStatDiceGroup[] {
  return (primaryGroups ?? []).filter(
    (group) =>
      group.kind !== 'skills' && group.kind !== 'occ' && group.kind !== 'race',
  )
}

function morphusExclusiveSkillDiceGroup(
  attr: ForgeAttrKey,
  character: Character,
  facadeSkillIds: readonly string[],
): LedgerStatDiceGroup | null {
  const exclusiveIds = collectMorphusExclusiveSkillIds(character, facadeSkillIds)
  if (exclusiveIds.length === 0) return null
  const details = buildForgeAttributeStatBonusDetails(
    attr,
    undefined,
    undefined,
    exclusiveIds,
  )
  const skillGroup = details.diceGroups.find((group) => group.kind === 'skills')
  if (!skillGroup) return null
  return {
    kind: skillGroup.kind,
    display: skillGroup.display,
    tooltip: skillGroup.tooltip,
  }
}

export function mergeFeatureModifiers(
  ...layers: readonly FeatureModifiers[]
): FeatureModifiers {
  const out: FeatureModifiers = {}
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (value == null || value === 0) continue
      out[key] = (out[key] ?? 0) + value
    }
  }
  return out
}

/** Nightbane R.C.C. innate Morphus combat / save / APM modifiers for creation ledger. */
export function buildMorphusCreationBasePassiveModifiers(): FeatureModifiers {
  const base = NIGHTBANE_MORPHUS_BASE_PROFILE
  const cb = base.combatBonuses ?? {}
  const out: FeatureModifiers = {}
  const keyMap: Record<string, string> = {
    initiative: 'initiative',
    strike: 'strike',
    parry: 'parry',
    dodge: 'dodge',
    rollPullPunch: 'rollWithPunch',
    saveMagic: 'save_magic',
    savePsionics: 'save_psionics',
    saveDisease: 'save_disease',
    saveHorrorFactor: 'save_horror',
  }
  for (const [src, dst] of Object.entries(keyMap)) {
    const value = cb[src as keyof typeof cb]
    if (typeof value === 'number' && value !== 0) out[dst] = value
  }
  if (base.extraAttacksPerMelee) {
    out.apm = (out.apm ?? 0) + base.extraAttacksPerMelee
  }
  return out
}

export function effectiveLedgerHandToHandTier(
  character: Character,
  occ: PalladiumOcc | undefined,
  activeForm: ActiveForm,
  supportsDualForm: boolean,
): CreationHandToHandTier {
  if (supportsDualForm && activeForm === 'morphus') {
    return NIGHTBANE_MORPHUS_BASE_PROFILE.handToHandMorphus as CreationHandToHandTier
  }
  return effectiveCreationHandToHandTier(character, occ)
}

export function resolveCreationLedgerHandToHandAccumulated(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
  supportsDualForm: boolean,
): AccumulatedHandToHandBonuses {
  const tier = effectiveLedgerHandToHandTier(
    character,
    occ,
    activeForm,
    supportsDualForm,
  )
  if (tier === 'none') return createEmptyAccumulatedHandToHandBonuses()
  const catalogId = handToHandCatalogIdForCreationTier(tier)
  const skill = catalogId ? getHandToHandSkillById(catalogId) : undefined
  if (!skill) return createEmptyAccumulatedHandToHandBonuses()
  return accumulateHandToHandBonuses(skill, character.level)
}

export function creationLedgerTraitPassiveModifiers(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): FeatureModifiers {
  return aggregateAllPassiveModifiers(character, activeForm, {}, occ)
}

/** Morphus trait + R.C.C. Morphus base saves only (no Facade race / O.C.C. / skill saves). */
export function creationLedgerSavePassiveModifiers(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
  supportsDualForm: boolean,
): FeatureModifiers {
  if (supportsDualForm && activeForm === 'morphus') {
    const morphusTraits = buildMorphusPassiveBundle(character, 'morphus', {})?.modifiers ?? {}
    return mergeFeatureModifiers(
      buildMorphusCreationBasePassiveModifiers(),
      morphusTraits,
    )
  }
  return creationLedgerTraitPassiveModifiers(character, activeForm, occ)
}

/** @deprecated Use {@link creationLedgerTraitPassiveModifiers} or {@link creationLedgerSavePassiveModifiers}. */
export function creationLedgerPassiveModifiers(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
  supportsDualForm: boolean,
): FeatureModifiers {
  return creationLedgerSavePassiveModifiers(
    character,
    activeForm,
    occ,
    supportsDualForm,
  )
}

export function parseLedgerSignedBonus(value: string): number | null {
  if (value === LEDGER_NA || value === LEDGER_UNASSIGNED) return null
  const trimmed = value.trim()
  if (/^impervious$/i.test(trimmed)) return null
  const percent = /^([+−–-]?)(\d+(?:\.\d+)?)%$/.exec(trimmed)
  if (percent) {
    const sign = percent[1] === '-' || percent[1] === '−' || percent[1] === '–' ? -1 : 1
    return sign * Number(percent[2])
  }
  const plain = /^([+−–-]?)(\d+(?:\.\d+)?)$/.exec(trimmed)
  if (plain) {
    const sign = plain[1] === '-' || plain[1] === '−' || plain[1] === '–' ? -1 : 1
    return sign * Number(plain[2])
  }
  const asNumber = Number(trimmed)
  return Number.isFinite(asNumber) ? asNumber : null
}

export function parseLedgerHintParts(
  hint?: string,
): Array<{ label: string; amount: number }> {
  if (!hint?.trim()) return []
  const parts: Array<{ label: string; amount: number }> = []
  for (const segment of hint.split(' · ')) {
    const trimmed = segment.trim()
    if (!trimmed) continue
    const match = /^(.+?):\s*([+−–-]?\d+(?:\.\d+)?%?)$/.exec(trimmed)
    if (!match) continue
    const amount = parseLedgerSignedBonus(match[2]!)
    if (amount == null) continue
    parts.push({ label: match[1]!.trim(), amount })
  }
  return parts
}

function hintPartsDelta(
  primaryParts: readonly { label: string; amount: number }[],
  morphusParts: readonly { label: string; amount: number }[],
): LedgerFlatContribution[] {
  const primaryMap = new Map(primaryParts.map((part) => [part.label, part.amount]))
  const deltas: LedgerFlatContribution[] = []
  for (const part of morphusParts) {
    const primaryAmount = primaryMap.get(part.label) ?? 0
    const delta = part.amount - primaryAmount
    if (delta !== 0) deltas.push({ label: part.label, amount: delta })
  }
  for (const [label, amount] of primaryMap) {
    if (!morphusParts.some((part) => part.label === label) && amount !== 0) {
      deltas.push({ label, amount: -amount })
    }
  }
  return deltas
}

/** How Morphus rows are compared to Facade rows after line assembly. */
export type MorphusLedgerDiffMode = 'facade_relative' | 'combat' | 'none'

/**
 * Single Morphus-vs-Facade diff pass for all live-ledger sections.
 * - facade_relative: vitals, exceptional — keep native tooltip or synthesize Facade-relative
 * - combat: highlight when value differs; tooltip unchanged (form-native stack)
 * - none: saves and other pass-through sections
 */
export function applyMorphusLedgerDiff<T extends MorphusDiffLedgerLine>(
  morphusLines: readonly T[],
  primaryLines: readonly MorphusDiffLedgerLine[],
  mode: MorphusLedgerDiffMode,
): T[] {
  if (mode === 'none') return [...morphusLines]

  const primaryByLabel = new Map(primaryLines.map((line) => [line.label, line]))
  return morphusLines.map((morphusLine) => {
    const primaryLine = primaryByLabel.get(morphusLine.label)
    if (!primaryLine || morphusLine.value === primaryLine.value) {
      return { ...morphusLine, valueModified: morphusLine.valueModified === true }
    }

    if (mode === 'combat') {
      return {
        ...morphusLine,
        valueModified: true,
      }
    }

    if (morphusLine.valueTooltip?.trim()) {
      return {
        ...morphusLine,
        valueModified: true,
        valueTooltip: morphusLine.valueTooltip,
      }
    }

    const primaryNum =
      parseCreationLedgerNumericValue(primaryLine.value) ??
      parseLedgerSignedBonus(primaryLine.value)
    const morphusNum =
      parseCreationLedgerNumericValue(morphusLine.value) ??
      parseLedgerSignedBonus(morphusLine.value)

    if (primaryNum != null && morphusNum != null) {
      let deltas = hintPartsDelta(
        parseLedgerHintParts(primaryLine.hint),
        parseLedgerHintParts(morphusLine.hint),
      )
      if (deltas.length === 0 && morphusNum !== primaryNum) {
        deltas = [{ label: 'Morphus', amount: morphusNum - primaryNum }]
      }
      return {
        ...morphusLine,
        valueModified: true,
        valueTooltip: formatMorphusVsPrimaryTooltip(primaryNum, deltas),
      }
    }

      return {
        ...morphusLine,
        valueModified: true,
        valueTooltip: formatLedgerTooltip({
          kind: 'morphus_text_fallback',
          facadeValue: primaryLine.value,
          morphusValue: morphusLine.value,
        }),
      }
  })
}

export function applyMorphusLedgerGroupDiff<T extends MorphusDiffLedgerLine>(
  morphusGroups: readonly { title: string; lines: readonly T[] }[],
  primaryGroups: readonly MorphusDiffLedgerGroup[],
  mode: MorphusLedgerDiffMode,
): { title: string; lines: T[] }[] {
  const primaryByTitle = new Map(primaryGroups.map((group) => [group.title, group.lines]))
  return morphusGroups.map((group) => ({
    title: group.title,
    lines: applyMorphusLedgerDiff(
      group.lines,
      primaryByTitle.get(group.title) ?? [],
      mode,
    ),
  }))
}

/** @deprecated Use {@link applyMorphusLedgerDiff} with mode `combat`. */
export function applyMorphusVsPrimaryCombatLedgerDiff<
  T extends MorphusDiffLedgerLine,
>(morphusLines: readonly T[], primaryLines: readonly MorphusDiffLedgerLine[]): T[] {
  return applyMorphusLedgerDiff(morphusLines, primaryLines, 'combat')
}

/** @deprecated Use {@link applyMorphusLedgerDiff} with mode `facade_relative`. */
export function applyMorphusVsPrimaryLedgerDiff<
  T extends MorphusDiffLedgerLine,
>(morphusLines: readonly T[], primaryLines: readonly MorphusDiffLedgerLine[]): T[] {
  return applyMorphusLedgerDiff(morphusLines, primaryLines, 'facade_relative')
}

/** @deprecated Use {@link applyMorphusLedgerGroupDiff} with mode `facade_relative`. */
export function applyMorphusVsPrimaryLedgerGroupDiff<
  T extends MorphusDiffLedgerLine,
>(
  morphusGroups: readonly { title: string; lines: readonly T[] }[],
  primaryGroups: readonly MorphusDiffLedgerGroup[],
): { title: string; lines: T[] }[] {
  return applyMorphusLedgerGroupDiff(morphusGroups, primaryGroups, 'facade_relative')
}

/** @deprecated Use {@link applyMorphusLedgerDiff} with mode `facade_relative`. */
export function applyMorphusVsPrimaryExceptionalLedgerDiff<
  T extends MorphusDiffLedgerLine,
>(morphusLines: readonly T[], primaryLines: readonly MorphusDiffLedgerLine[]): T[] {
  return applyMorphusLedgerDiff(morphusLines, primaryLines, 'facade_relative')
}

/** @deprecated Use {@link applyMorphusLedgerGroupDiff} with mode `facade_relative`. */
export function applyMorphusVsPrimaryExceptionalLedgerGroupDiff<
  T extends MorphusDiffLedgerLine,
>(
  morphusGroups: readonly { title: string; lines: readonly T[] }[],
  primaryGroups: readonly MorphusDiffLedgerGroup[],
): { title: string; lines: T[] }[] {
  return applyMorphusLedgerGroupDiff(morphusGroups, primaryGroups, 'facade_relative')
}

export function strengthCapacitiesFromAttributes(
  attrs: CharacterAttributes,
): ReturnType<typeof evaluateStrengthFromPhysicalStat> {
  return evaluateStrengthFromPhysicalStat(attrs.ps)
}

function readMorphusStoredScalar(
  character: Character,
  attr: ForgeAttrKey,
): number {
  const attrs = character.morphus.attributes
  return attr === 'ps' ? attrs.ps.score : attrs[attr]
}

function nightbaneBaseAttributeBump(
  profile: NightbaneMorphusBaseProfile,
  attr: ForgeAttrKey,
): number {
  const bump = profile.attributeBonuses[attr as keyof typeof profile.attributeBonuses]
  return typeof bump === 'number' ? bump : 0
}

function collectTraitAttributeDeltas(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'statModifiers' | 'mobility' | 'activatedAbilities' | 'gimmickToySwitches'
  >[],
  attr: ForgeAttrKey,
  polymorphicBase: number,
  finalized: boolean,
): LedgerFlatContribution[] {
  const statKey = attr as keyof MorphusStatModifiers
  const resolveOpts = morphusCreationPreviewResolveOptions(finalized)
  const out: LedgerFlatContribution[] = []
  for (const trait of traits) {
    const blocks = collectMorphusStatModifierBlocks([trait], statKey)
    if (!blocks.length) continue
    const explicitDelta = polymorphicFlatOnlyDeltaFromBase(
      polymorphicBase,
      blocks,
      resolveOpts,
    )
    const diceFlat = blocks.reduce(
      (sum, mod) => sum + modifierFlatFromDiceString(mod),
      0,
    )
    const amount = explicitDelta + diceFlat
    if (amount === 0) continue
    out.push({ label: trait.name, amount })
  }
  return out
}

/** Trait flat/percent attribute bonuses (excludes dice — entered on Review). */
export function morphusTraitAttributeFlatBonus(
  character: Pick<
    Character,
    | 'activeMorphusCharacteristicIds'
    | 'morphusTraitSlotResolutions'
    | 'creationTraitForgeStubComplete'
    | 'morphusForgeState'
    | 'morphus'
  >,
  attr: ForgeAttrKey,
  primaryTotal: number | null,
): number {
  if (primaryTotal == null) return 0
  const baseProfile = NIGHTBANE_MORPHUS_BASE_PROFILE
  const baseBump = nightbaneBaseAttributeBump(baseProfile, attr)
  const traits = resolveActiveMorphusTraits(character)
  const finalized = character.creationTraitForgeStubComplete === true
  const polymorphicBase = primaryTotal + baseBump
  return collectTraitAttributeDeltas(traits, attr, polymorphicBase, finalized).reduce(
    (sum, delta) => sum + delta.amount,
    0,
  )
}

export function collectMorphusTraitStatDiceContributions(
  character: Pick<
    Character,
    'activeMorphusCharacteristicIds' | 'morphusTraitSlotResolutions'
  >,
  statKey: keyof MorphusStatModifiers,
): LedgerDiceContribution[] {
  const traits = resolveActiveMorphusTraits(character)
  const out: LedgerDiceContribution[] = []
  for (const trait of traits) {
    const blocks = collectMorphusStatModifierBlocks([trait], statKey)
    for (const mod of blocks) {
      if (mod.dice?.trim()) {
        out.push({ notation: mod.dice.trim(), label: trait.name })
      }
    }
  }
  return out
}

export function resolveMorphusAttributeTotal(
  character: Character,
  attr: ForgeAttrKey,
  primaryTotal: number | null,
  baseProfile: NightbaneMorphusBaseProfile,
  traitDiceBonus = 0,
): {
  morphusTotal: number | null
  morphusDeltas: LedgerFlatContribution[]
  pendingMinFloor?: number
} {
  const baseBump = nightbaneBaseAttributeBump(baseProfile, attr)
  const baseApplied = character.morphusForgeState?.baseStatsApplied === true
  const traits = resolveActiveMorphusTraits(character)
  const finalized = character.creationTraitForgeStubComplete === true
  const statKey = attr as keyof MorphusStatModifiers
  const pendingMinFloor = collectMorphusAttributeMinFloor(traits, statKey)

  const morphusDeltas: LedgerFlatContribution[] = []
  if (baseBump !== 0) {
    morphusDeltas.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: baseBump })
  }

  const polymorphicBase = baseApplied
    ? readMorphusStoredScalar(character, attr)
    : (primaryTotal ?? 0) + baseBump

  for (const traitDelta of collectTraitAttributeDeltas(
    traits,
    attr,
    polymorphicBase,
    finalized,
  )) {
    morphusDeltas.push(traitDelta)
  }

  if (primaryTotal != null) {
    const rawTotal =
      primaryTotal +
      morphusDeltas.reduce((sum, delta) => sum + delta.amount, 0) +
      traitDiceBonus
    const morphusTotal = applyMorphusAttributeMinFloor(
      rawTotal,
      finalized ? pendingMinFloor : undefined,
    )
    return { morphusTotal, morphusDeltas, pendingMinFloor }
  }

  if (baseApplied) {
    const traitSum = morphusDeltas
      .filter((d) => d.label !== MORPHUS_LEDGER_RACE_LABEL)
      .reduce((sum, d) => sum + d.amount, 0)
    const morphusTotal = applyMorphusAttributeMinFloor(
      readMorphusStoredScalar(character, attr) + traitSum + traitDiceBonus,
      finalized ? pendingMinFloor : undefined,
    )
    return { morphusTotal, morphusDeltas, pendingMinFloor }
  }

  return { morphusTotal: null, morphusDeltas, pendingMinFloor }
}

/**
 * Morphus Live Ledger attributes: Facade totals as baseline, Morphus-only bumps in green.
 */
export function buildMorphusCreationAttributeBlock(
  primaryLines: readonly MorphusAttributeLedgerLine[],
  character: Character,
  pendingMorphusAttrTotals: Partial<Record<ForgeAttrKey, number>> = {},
  pendingMorphusAttrDiceBreakdown: Partial<
    Record<ForgeAttrKey, LedgerFlatContribution[]>
  > = {},
  pendingMorphusAttrBlocks: Partial<Record<ForgeAttrKey, PendingDiceBlock>> = {},
  resolutions: Readonly<Record<string, number>> = {},
  facadeSkillIds: readonly string[] = [],
): MorphusAttributeLedgerLine[] {
  const baseProfile = NIGHTBANE_MORPHUS_BASE_PROFILE

  return FORGE_ATTRIBUTE_KEYS.map((attr, index) => {
    const primaryLine = primaryLines[index] ?? {
      label: ATTR_LEDGER_LABELS[attr],
      value: LEDGER_UNASSIGNED,
    }
    const primaryTotal = parseCreationLedgerNumericValue(primaryLine.value)
    const finalized = character.creationTraitForgeStubComplete === true
    const pendingTotal = pendingMorphusAttrTotals[attr]
    const { morphusTotal: resolvedTotal, morphusDeltas, pendingMinFloor } =
      resolveMorphusAttributeTotal(character, attr, primaryTotal, baseProfile, 0)
    const morphusTotal =
      pendingTotal != null
        ? applyMorphusAttributeMinFloor(
            pendingTotal,
            finalized ? pendingMinFloor : undefined,
          )
        : resolvedTotal
    const minSuffix =
      !finalized && pendingMinFloor != null ? `(min ${pendingMinFloor})` : undefined
    const labelSuffix = [primaryLine.labelSuffix, minSuffix].filter(Boolean).join(' ') || undefined

    const traitDiceEntries = pendingMorphusAttrDiceBreakdown[attr] ?? []
    const pendingBlock = pendingMorphusAttrBlocks[attr]
    const hasMorphusPendingDice = pendingBlockHasUnresolvedRolls(
      pendingBlock,
      resolutions,
    )
    const hasPendingDice =
      hasMorphusPendingDice || primaryLine.hasPendingRolls === true
    const differsFromPrimary =
      morphusTotal != null && primaryTotal != null && morphusTotal !== primaryTotal
    const traitDiceGroup = buildLedgerTraitDiceGroup(
      collectMorphusTraitStatDiceContributions(character, attr as keyof MorphusStatModifiers),
    )
    const exclusiveSkillGroup = morphusExclusiveSkillDiceGroup(
      attr,
      character,
      facadeSkillIds,
    )
    const diceGroups = [
      ...primaryDiceGroupsForMorphusLedger(primaryLine.diceGroups),
      ...(exclusiveSkillGroup ? [exclusiveSkillGroup] : []),
      ...(traitDiceGroup ? [traitDiceGroup] : []),
    ]

    const tooltipDeltas = [...morphusDeltas]
    for (const entry of traitDiceEntries) {
      tooltipDeltas.push(entry)
    }

    const showMorphusTooltip =
      primaryTotal != null &&
      (differsFromPrimary ||
        traitDiceGroup != null ||
        exclusiveSkillGroup != null ||
        traitDiceEntries.length > 0 ||
        hasPendingDice)

    return buildCreationLedgerLine({
      label: primaryLine.label,
      labelSuffix,
      value: morphusTotal != null ? String(morphusTotal) : primaryLine.value,
      valueModified:
        differsFromPrimary ||
        traitDiceGroup != null ||
        exclusiveSkillGroup != null ||
        traitDiceEntries.length > 0 ||
        hasPendingDice,
      hasPendingRolls: hasPendingDice,
      diceGroups: diceGroups.length > 0 ? diceGroups : undefined,
      tooltip: showMorphusTooltip
        ? {
            kind: 'morphus_relative',
            facadeTotal: primaryTotal,
            deltas: tooltipDeltas,
            pendingRolls: hasPendingDice,
          }
        : primaryLine.valueTooltip
          ? { kind: 'rendered', text: primaryLine.valueTooltip }
          : undefined,
    })
  })
}

export function morphusAttributeScoresFromLedgerLines(
  lines: readonly MorphusAttributeLedgerLine[],
): Partial<Record<ForgeAttrKey, number>> {
  const scores: Partial<Record<ForgeAttrKey, number>> = {}
  for (const line of lines) {
    const attr = LABEL_TO_ATTR[line.label]
    if (!attr) continue
    const value = parseCreationLedgerNumericValue(line.value)
    if (value != null) scores[attr] = value
  }
  return scores
}

/** Morphus trait Horror Factor bonuses (flat totals + dice to roll at Spawn). */
export function buildMorphusTraitHorrorFactorDetails(
  character: Pick<
    Character,
    'activeMorphusCharacteristicIds' | 'morphusTraitSlotResolutions' | 'creationTraitForgeStubComplete'
  >,
): {
  flatTotal: number
  flatBreakdown: LedgerFlatContribution[]
  diceContributions: LedgerDiceContribution[]
} {
  const traits = resolveActiveMorphusTraits(character)
  const finalized = character.creationTraitForgeStubComplete === true
  const resolveOpts = morphusCreationPreviewResolveOptions(finalized)
  const flatBreakdown: LedgerFlatContribution[] = []
  const diceContributions: LedgerDiceContribution[] = []

  for (const trait of traits) {
    const blocks = collectMorphusStatModifierBlocks([trait], 'hf')
    for (const mod of blocks) {
      if (mod.dice?.trim()) {
        diceContributions.push({ notation: mod.dice.trim(), label: trait.name })
      }
    }
    if (!blocks.length) continue
    const delta = polymorphicFlatOnlyDeltaFromBase(0, blocks, resolveOpts)
    if (delta !== 0) {
      flatBreakdown.push({ label: trait.name, amount: delta })
    }
  }

  return {
    flatTotal: flatBreakdown.reduce((sum, item) => sum + item.amount, 0),
    flatBreakdown,
    diceContributions,
  }
}

/** Per-trait Morphus attribution for passive modifier keys (ledger tooltips). */
export function morphusTraitPassiveKeyAttribution(
  character: Pick<
    Character,
    | 'activeMorphusCharacteristicIds'
    | 'morphusTraitSlotResolutions'
    | 'creationTraitForgeStubComplete'
  >,
  passiveKeys: readonly string[],
): LedgerFlatContribution[] {
  const traits = resolveActiveMorphusTraits(character)
  if (traits.length === 0 || passiveKeys.length === 0) return []

  const finalized = character.creationTraitForgeStubComplete === true
  const resolveOpts = morphusCreationPreviewResolveOptions(finalized)
  const statKeys = [
    ...new Set(passiveKeys.flatMap((key) => morphusStatKeysForPassiveKey(key))),
  ]
  const out: LedgerFlatContribution[] = []

  for (const trait of traits) {
    let amount = 0
    const saveBonuses = aggregateMorphusSaveBonuses([trait])
    for (const key of passiveKeys) {
      const value = saveBonuses[key]
      if (value != null && value !== 0) amount += value
    }
    for (const statKey of statKeys) {
      const passiveKey = MORPHUS_STAT_TO_PASSIVE[statKey]
      if (!passiveKey || !passiveKeys.includes(passiveKey as string)) continue
      const blocks = collectMorphusStatModifierBlocks([trait], statKey)
      if (!blocks.length) continue
      amount += polymorphicFlatOnlyDeltaFromBase(0, blocks, resolveOpts)
    }
    if (amount !== 0) {
      out.push({ label: trait.name, amount })
    }
  }

  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** Morphus trait S.D.C. bonuses (flat totals + dice to roll at Spawn). */
export function buildMorphusTraitSdcBonusDetails(
  character: Pick<
    Character,
    'activeMorphusCharacteristicIds' | 'morphusTraitSlotResolutions'
  >,
): {
  flatTotal: number
  flatBreakdown: LedgerFlatContribution[]
  diceContributions: LedgerDiceContribution[]
} {
  const traits = resolveActiveMorphusTraits(character)
  const flatBreakdown: LedgerFlatContribution[] = []
  const diceContributions: LedgerDiceContribution[] = []

  for (const trait of traits) {
    const blocks = collectMorphusStatModifierBlocks([trait], 'sdc')
    for (const mod of blocks) {
      if (mod.dice?.trim()) {
        diceContributions.push({ notation: mod.dice.trim(), label: trait.name })
      }
      if (typeof mod.flat === 'number' && mod.flat !== 0) {
        flatBreakdown.push({ label: trait.name, amount: mod.flat })
      }
    }
  }

  return {
    flatTotal: flatBreakdown.reduce((sum, item) => sum + item.amount, 0),
    flatBreakdown,
    diceContributions,
  }
}

export function applyLedgerAttributeScores(
  template: CharacterAttributes,
  scores: Partial<Record<ForgeAttrKey, number>>,
): CharacterAttributes {
  const attrs = { ...template, ps: { ...template.ps } }
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const value = scores[attr]
    if (value == null) continue
    if (attr === 'ps') {
      attrs.ps = { ...attrs.ps, score: value }
    } else {
      attrs[attr] = value
    }
  }
  return attrs
}
