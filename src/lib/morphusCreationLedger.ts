import type {
  AccumulatedHandToHandBonuses,
  ActiveForm,
  Character,
  CharacterAttributes,
  FeatureModifiers,
  MorphusCharacteristic,
  PalladiumOcc,
} from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import {
  collectMorphusStatModifierBlocks,
  type MorphusStatModifiers,
} from './morphusCharacteristicAggregation'
import { resolveActiveMorphusTraits } from './morphusPassiveBridge'
import {
  collectMorphusAttributeMinFloor,
  polymorphicDeltaFromBase,
  applyMorphusAttributeMinFloor,
} from './morphusPolymorphicResolver'
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
import { buildMorphusPassiveBundle } from './morphusPassiveBridge'

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

/** Morphus attribute tooltip — human-form total plus each Morphus-only delta. */
export function formatMorphusVsPrimaryTooltip(
  primaryTotal: number,
  morphusDeltas: readonly LedgerFlatContribution[],
): string {
  const parts = [`Facade ${primaryTotal}`]
  for (const item of morphusDeltas) {
    parts.push(`${item.label} ${item.amount >= 0 ? '+' : ''}${item.amount}`)
  }
  return parts.join(', ')
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

function morphusTextTooltip(primaryValue: string, morphusValue: string): string {
  if (primaryValue === morphusValue) return morphusValue
  if (primaryValue === LEDGER_NA || primaryValue === LEDGER_UNASSIGNED) {
    return `Facade ${primaryValue}, ${MORPHUS_LEDGER_RACE_LABEL} ${morphusValue}`
  }
  return `Facade ${primaryValue}, ${MORPHUS_LEDGER_RACE_LABEL} ${morphusValue}`
}

function formatNativeCombatTooltip(line: MorphusDiffLedgerLine): string | undefined {
  if (line.valueTooltip) {
    return line.valueTooltip.replace(/^\(|\)$/g, '')
  }
  if (line.hint) {
    return line.hint.replace(/ · /g, ', ')
  }
  return undefined
}

/** Combat rows: form-native breakdown only (no Facade prefix — combat is computed per form). */
export function applyMorphusVsPrimaryCombatLedgerDiff<
  T extends MorphusDiffLedgerLine,
>(morphusLines: readonly T[], primaryLines: readonly MorphusDiffLedgerLine[]): T[] {
  const primaryByLabel = new Map(primaryLines.map((line) => [line.label, line]))
  return morphusLines.map((morphusLine) => {
    const primaryLine = primaryByLabel.get(morphusLine.label)
    if (!primaryLine || morphusLine.value === primaryLine.value) {
      return { ...morphusLine, valueModified: morphusLine.valueModified === true }
    }

    return {
      ...morphusLine,
      valueModified: true,
      valueTooltip: formatNativeCombatTooltip(morphusLine) ?? morphusLine.valueTooltip,
    }
  })
}

/** Green highlight + Facade-relative tooltip for Morphus ledger rows. */
export function applyMorphusVsPrimaryLedgerDiff<
  T extends MorphusDiffLedgerLine,
>(morphusLines: readonly T[], primaryLines: readonly MorphusDiffLedgerLine[]): T[] {
  const primaryByLabel = new Map(primaryLines.map((line) => [line.label, line]))
  return morphusLines.map((morphusLine) => {
    const primaryLine = primaryByLabel.get(morphusLine.label)
    if (!primaryLine || morphusLine.value === primaryLine.value) {
      return { ...morphusLine, valueModified: morphusLine.valueModified === true }
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
      valueTooltip: morphusTextTooltip(primaryLine.value, morphusLine.value),
    }
  })
}

export function applyMorphusVsPrimaryLedgerGroupDiff<
  T extends MorphusDiffLedgerLine,
>(
  morphusGroups: readonly { title: string; lines: readonly T[] }[],
  primaryGroups: readonly MorphusDiffLedgerGroup[],
): { title: string; lines: T[] }[] {
  const primaryByTitle = new Map(primaryGroups.map((group) => [group.title, group.lines]))
  return morphusGroups.map((group) => ({
    title: group.title,
    lines: applyMorphusVsPrimaryLedgerDiff(
      group.lines,
      primaryByTitle.get(group.title) ?? [],
    ),
  }))
}

/** Exceptional bonuses: green when Morphus differs from Facade — no Facade-relative tooltip. */
export function applyMorphusVsPrimaryExceptionalLedgerDiff<
  T extends MorphusDiffLedgerLine,
>(morphusLines: readonly T[], primaryLines: readonly MorphusDiffLedgerLine[]): T[] {
  const primaryByLabel = new Map(primaryLines.map((line) => [line.label, line]))
  return morphusLines.map((morphusLine) => {
    const primaryLine = primaryByLabel.get(morphusLine.label)
    if (!primaryLine || morphusLine.value === primaryLine.value) {
      return { ...morphusLine, valueModified: morphusLine.valueModified === true }
    }
    return {
      ...morphusLine,
      valueModified: true,
      valueTooltip: undefined,
    }
  })
}

export function applyMorphusVsPrimaryExceptionalLedgerGroupDiff<
  T extends MorphusDiffLedgerLine,
>(
  morphusGroups: readonly { title: string; lines: readonly T[] }[],
  primaryGroups: readonly MorphusDiffLedgerGroup[],
): { title: string; lines: T[] }[] {
  const primaryByTitle = new Map(primaryGroups.map((group) => [group.title, group.lines]))
  return morphusGroups.map((group) => ({
    title: group.title,
    lines: applyMorphusVsPrimaryExceptionalLedgerDiff(
      group.lines,
      primaryByTitle.get(group.title) ?? [],
    ),
  }))
}

export function strengthCapacitiesFromAttributes(
  attrs: CharacterAttributes,
): ReturnType<typeof evaluateStrengthFromPhysicalStat> {
  return evaluateStrengthFromPhysicalStat(attrs.ps.score)
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
): LedgerFlatContribution[] {
  const statKey = attr as keyof MorphusStatModifiers
  const out: LedgerFlatContribution[] = []
  for (const trait of traits) {
    const blocks = collectMorphusStatModifierBlocks([trait], statKey)
    if (!blocks.length) continue
    const delta = polymorphicDeltaFromBase(polymorphicBase, blocks, {
      applyFloors: false,
    })
    if (delta === 0) continue
    out.push({ label: trait.name, amount: delta })
  }
  return out
}

function resolveMorphusAttributeTotal(
  character: Character,
  attr: ForgeAttrKey,
  primaryTotal: number | null,
  baseProfile: NightbaneMorphusBaseProfile,
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

  for (const traitDelta of collectTraitAttributeDeltas(traits, attr, polymorphicBase)) {
    morphusDeltas.push(traitDelta)
  }

  if (baseApplied) {
    const traitSum = morphusDeltas
      .filter((d) => d.label !== MORPHUS_LEDGER_RACE_LABEL)
      .reduce((sum, d) => sum + d.amount, 0)
    const morphusTotal = applyMorphusAttributeMinFloor(
      readMorphusStoredScalar(character, attr) + traitSum,
      finalized ? pendingMinFloor : undefined,
    )
    return { morphusTotal, morphusDeltas, pendingMinFloor }
  }

  if (primaryTotal == null) {
    return { morphusTotal: null, morphusDeltas: [], pendingMinFloor }
  }

  const rawTotal =
    primaryTotal + morphusDeltas.reduce((sum, delta) => sum + delta.amount, 0)
  const morphusTotal = applyMorphusAttributeMinFloor(
    rawTotal,
    finalized ? pendingMinFloor : undefined,
  )
  return { morphusTotal, morphusDeltas, pendingMinFloor }
}

/**
 * Morphus Live Ledger attributes: Facade totals as baseline, Morphus-only bumps in green.
 */
export function buildMorphusCreationAttributeBlock(
  primaryLines: readonly MorphusAttributeLedgerLine[],
  character: Character,
): MorphusAttributeLedgerLine[] {
  const baseProfile = NIGHTBANE_MORPHUS_BASE_PROFILE

  return FORGE_ATTRIBUTE_KEYS.map((attr, index) => {
    const primaryLine = primaryLines[index] ?? {
      label: ATTR_LEDGER_LABELS[attr],
      value: LEDGER_UNASSIGNED,
    }
    const primaryTotal = parseCreationLedgerNumericValue(primaryLine.value)
    const { morphusTotal, morphusDeltas, pendingMinFloor } = resolveMorphusAttributeTotal(
      character,
      attr,
      primaryTotal,
      baseProfile,
    )

    const finalized = character.creationTraitForgeStubComplete === true
    const minSuffix =
      !finalized && pendingMinFloor != null ? `(min ${pendingMinFloor})` : undefined
    const labelSuffix = [primaryLine.labelSuffix, minSuffix].filter(Boolean).join(' ') || undefined

    const differsFromPrimary =
      morphusTotal != null && primaryTotal != null && morphusTotal !== primaryTotal

    return {
      label: primaryLine.label,
      inlineRaceRoll: primaryLine.inlineRaceRoll,
      labelSuffix,
      value: morphusTotal != null ? String(morphusTotal) : primaryLine.value,
      valueModified: differsFromPrimary,
      valueTooltip:
        differsFromPrimary && primaryTotal != null
          ? formatMorphusVsPrimaryTooltip(primaryTotal, morphusDeltas)
          : primaryLine.valueTooltip,
      diceGroups: primaryLine.diceGroups,
    }
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
