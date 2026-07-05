import type { SaveRollBonusLine } from './saveRollDisplay'
import { formatBonus } from './combatQuickBonuses'
import {
  formatFlatValueTooltip,
  type LedgerFlatContribution,
  type LedgerStatDiceGroup,
} from './ledgerStatBonuses'
import {
  appendPendingRollsToTooltip,
  formatCombatStatStackTooltip,
  formatFacadeAttributeStackTooltip,
  formatMorphusRelativeStatTooltip,
  formatSaveStatStackTooltip,
  pendingBlockHasUnresolvedRolls,
  statStackTotal,
  type StatStackTerm,
} from './creationStatEngine'
import type { HorrorFactorProfile } from './saveProfile'
import type { VitalAttrFlatTerm } from './ledgerVitalFormula'
import {
  formatVitalityBlockValueTooltip,
  ledgerDiceGroupsFromPendingGroups,
  pendingDiceBlockRunningTotal,
  type PendingDiceBlock,
} from './spawnDiceBlocks'
import type { FacadeAttributeSnapshot } from './creationStatEngine'
import { resolveLedgerLabelTooltip } from './ledgerStatDescriptions'

/** True when hint text is a numeric modifier breakdown (belongs on value tooltip only). */
export function isLedgerBreakdownHint(hint?: string): boolean {
  if (!hint?.trim()) return false
  if (hint.includes(' · ')) return true
  return /:\s*[+\-−–]/.test(hint)
}

/** Dice groups for rolls; value tooltip for flats — strip breakdown hints from the row. */
export function applyLedgerRowDisplayPolicy(
  line: CreationLedgerLine,
): CreationLedgerLine {
  const hasDiceGroups = (line.diceGroups?.length ?? 0) > 0
  if (hasDiceGroups) {
    return { ...line, hint: undefined, skillDetailTooltip: undefined }
  }
  if (isLedgerBreakdownHint(line.hint)) {
    return { ...line, hint: undefined, skillDetailTooltip: undefined }
  }
  return line
}

export function formatHorrorFactorLedgerTooltip(input: {
  profile: HorrorFactorProfile
  traitFlatBreakdown: readonly LedgerFlatContribution[]
  pendingRolls?: boolean
}): string | undefined {
  const traitLabels = new Set(input.traitFlatBreakdown.map((entry) => entry.label))
  const parts: LedgerFlatContribution[] = []
  for (const contribution of input.profile.contributions) {
    if (contribution.amount === 0) continue
    if (contribution.label === 'Traits') continue
    if (traitLabels.has(contribution.label)) continue
    parts.push({ label: contribution.label, amount: contribution.amount })
  }
  parts.push(...input.traitFlatBreakdown)
  return appendPendingRollsToTooltip(
    formatFlatValueTooltip(parts),
    input.pendingRolls ?? false,
  )
}

export type CreationLedgerGroup = {
  title: string
  lines: CreationLedgerLine[]
}

/** Canonical live-ledger row — single schema for facade and Morphus UI output. */
export type CreationLedgerLine = {
  label: string
  /** Brief description shown when hovering the stat name (header). */
  labelTooltip?: string
  value: string
  hint?: string
  inlineRaceRoll?: string
  labelSuffix?: string
  diceGroups?: LedgerStatDiceGroup[]
  valueModified?: boolean
  valueTooltip?: string
  hasPendingRolls?: boolean
  flatTerms?: VitalAttrFlatTerm[]
  skillFlatTerms?: LedgerFlatContribution[]
  morphusFacadeSdc?: number
  skillDetailTooltip?: string
}

/** Tooltip rendering modes — every live-ledger stat uses exactly one. */
export type LedgerTooltipSpec =
  | { kind: 'none' }
  | {
      kind: 'facade_attribute'
      poolRoll: number | null
      flatBreakdown: readonly LedgerFlatContribution[]
      occVariableBonus: number
      enteredDice?: readonly LedgerFlatContribution[]
      pendingRolls?: boolean
    }
  | {
      kind: 'morphus_relative'
      facadeTotal: number
      deltas: readonly LedgerFlatContribution[]
      pendingRolls?: boolean
    }
  | {
      kind: 'stack_combat'
      terms: readonly StatStackTerm[]
      skillEntries?: readonly { name: string; amount: number }[]
      traitEntries?: readonly { name: string; amount: number }[]
    }
  | { kind: 'stack_save'; terms: readonly StatStackTerm[] }
  | {
      kind: 'stack_flat'
      breakdown: readonly LedgerFlatContribution[]
      pendingRolls?: boolean
    }
  | {
      kind: 'horror_factor'
      profile: HorrorFactorProfile
      traitFlatBreakdown: readonly LedgerFlatContribution[]
      pendingRolls?: boolean
    }
  | {
      kind: 'vitality_block'
      flatTerms: readonly VitalAttrFlatTerm[]
      block?: PendingDiceBlock
      resolutions: Readonly<Record<string, number>>
      skillFlats?: readonly LedgerFlatContribution[]
      pendingRolls?: boolean
    }
  | {
      kind: 'apm'
      terms: readonly StatStackTerm[]
    }

export function resolveLedgerHasPendingRolls(
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
  explicit?: boolean,
): boolean {
  if (explicit === true) return true
  return pendingBlockHasUnresolvedRolls(block, resolutions)
}

/** Single tooltip dispatcher for facade and Morphus live-ledger rows. */
export function formatLedgerTooltip(spec: LedgerTooltipSpec): string | undefined {
  switch (spec.kind) {
    case 'none':
      return undefined
    case 'facade_attribute':
      return formatFacadeAttributeStackTooltip(
        spec.poolRoll,
        spec.flatBreakdown,
        spec.occVariableBonus,
        spec.enteredDice ?? [],
        spec.pendingRolls ?? false,
      )
    case 'morphus_relative':
      return formatMorphusRelativeStatTooltip(
        spec.facadeTotal,
        spec.deltas,
        spec.pendingRolls ?? false,
      )
    case 'stack_combat':
      return formatCombatStatStackTooltip(
        spec.terms,
        spec.skillEntries ?? [],
        spec.traitEntries ?? [],
      )
    case 'stack_save':
      return formatSaveStatStackTooltip(spec.terms)
    case 'stack_flat':
      return appendPendingRollsToTooltip(
        formatFlatValueTooltip(spec.breakdown),
        spec.pendingRolls ?? false,
      )
    case 'horror_factor':
      return formatHorrorFactorLedgerTooltip({
        profile: spec.profile,
        traitFlatBreakdown: spec.traitFlatBreakdown,
        pendingRolls: spec.pendingRolls,
      })
    case 'vitality_block':
      return appendPendingRollsToTooltip(
        formatVitalityBlockValueTooltip(
          spec.flatTerms,
          spec.block,
          spec.resolutions,
          spec.skillFlats ?? [],
        ),
        spec.pendingRolls ?? false,
      )
    case 'apm': {
      const parts = ['Base: 2']
      for (const term of spec.terms) {
        if (term.amount === 0) continue
        parts.push(`${term.label}: +${term.amount}`)
      }
      if (parts.length <= 1) return undefined
      return `(${parts.join(', ')})`
    }
  }
}

export type BuildCreationLedgerLineInput = {
  label: string
  labelTooltip?: string
  value: string
  tooltip?: LedgerTooltipSpec
  hint?: string
  valueModified?: boolean
  hasPendingRolls?: boolean
  pendingBlock?: PendingDiceBlock
  resolutions?: Readonly<Record<string, number>>
  inlineRaceRoll?: string
  labelSuffix?: string
  diceGroups?: LedgerStatDiceGroup[]
  flatTerms?: VitalAttrFlatTerm[]
  skillFlatTerms?: LedgerFlatContribution[]
  morphusFacadeSdc?: number
  skillDetailTooltip?: string
  valueTooltipOverride?: string
}

/** Single row assembler — all live-ledger stats pass through here before UI render. */
export function buildCreationLedgerLine(
  input: BuildCreationLedgerLineInput,
): CreationLedgerLine {
  const hasPendingRolls = resolveLedgerHasPendingRolls(
    input.pendingBlock,
    input.resolutions ?? {},
    input.hasPendingRolls,
  )
  const valueTooltip =
    input.valueTooltipOverride ??
    (input.tooltip != null ? formatLedgerTooltip(input.tooltip) : undefined)

  const diceGroups =
    input.diceGroups && input.diceGroups.length > 0
      ? input.diceGroups
      : input.pendingBlock && input.pendingBlock.groups.length > 0
        ? ledgerDiceGroupsFromPendingGroups(input.pendingBlock.groups)
        : undefined

  return applyLedgerRowDisplayPolicy({
    label: input.label,
    labelTooltip: resolveLedgerLabelTooltip(input.label, input.labelTooltip),
    value: input.value,
    hint: input.hint,
    inlineRaceRoll: input.inlineRaceRoll,
    labelSuffix: input.labelSuffix,
    diceGroups,
    valueModified: input.valueModified,
    valueTooltip,
    hasPendingRolls: hasPendingRolls || undefined,
    flatTerms: input.flatTerms,
    skillFlatTerms: input.skillFlatTerms,
    morphusFacadeSdc: input.morphusFacadeSdc,
    skillDetailTooltip: input.skillDetailTooltip,
  })
}

export function buildFacadeAttributeLedgerLine(
  label: string,
  snapshot: FacadeAttributeSnapshot,
  labelSuffix?: string,
  unassignedValue = '—',
): CreationLedgerLine {
  return buildCreationLedgerLine({
    label,
    value: snapshot.total != null ? String(snapshot.total) : unassignedValue,
    inlineRaceRoll: snapshot.inlineRaceRoll,
    labelSuffix,
    valueModified: snapshot.valueModified,
    hasPendingRolls: snapshot.hasPendingRolls,
    diceGroups: snapshot.diceGroups.length > 0 ? snapshot.diceGroups : undefined,
    tooltip: {
      kind: 'facade_attribute',
      poolRoll: snapshot.poolRoll,
      flatBreakdown: snapshot.flatBreakdown,
      occVariableBonus: snapshot.variableBonus,
      enteredDice: snapshot.enteredDice,
      pendingRolls: snapshot.hasPendingRolls,
    },
  })
}

export function buildVitalityLedgerLineFromBlock(
  label: string,
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
  fallback: BuildCreationLedgerLineInput,
): CreationLedgerLine {
  if (!block) {
    return buildCreationLedgerLine({ ...fallback, label })
  }

  const rolls = block.groups.flatMap((group) => group.rolls)
  const anyEntered = rolls.some((roll) => resolutions[roll.id] != null)
  const hasPendingRolls = pendingBlockHasUnresolvedRolls(block, resolutions)

  if (!anyEntered && block.flatBaseline <= 0) {
    return buildCreationLedgerLine({
      ...fallback,
      label,
      pendingBlock: block,
      resolutions,
      hasPendingRolls,
    })
  }

  const total = pendingDiceBlockRunningTotal(block, resolutions)

  return buildCreationLedgerLine({
    ...fallback,
    label,
    value: String(total),
    valueModified:
      block.flatBaseline > 0 || anyEntered || fallback.valueModified === true,
    pendingBlock: block,
    resolutions,
    hasPendingRolls,
    flatTerms: block.flatTerms ?? fallback.flatTerms,
    skillFlatTerms: block.skillFlatTerms ?? fallback.skillFlatTerms,
    tooltip: {
      kind: 'vitality_block',
      flatTerms: block.flatTerms ?? fallback.flatTerms ?? [],
      block,
      resolutions,
      skillFlats: [
        ...(fallback.skillFlatTerms ?? []),
        ...(block.skillFlatTerms ?? []),
      ],
      pendingRolls: hasPendingRolls,
    },
  })
}

export function formatBonusBreakdownHint(
  parts: readonly SaveRollBonusLine[],
): string | undefined {
  const active = parts.filter((p) => p.amount !== 0)
  if (active.length === 0) return undefined
  return active.map((p) => `${p.label}: ${formatBonus(p.amount)}`).join(' · ')
}

export function formatSkillSourcesTooltip(
  entries: readonly { name: string; amount: number }[],
): string | undefined {
  if (entries.length === 0) return undefined
  return entries.map((e) => `${e.name}: ${formatBonus(e.amount)}`).join(' · ')
}

export function buildStackBonusLedgerLine(input: {
  label: string
  stack: readonly StatStackTerm[]
  value: string
  valueModified?: boolean
  hintParts?: readonly SaveRollBonusLine[]
  tooltip?:
    | { kind: 'stack_combat'; skillEntries?: readonly { name: string; amount: number }[]; traitEntries?: readonly { name: string; amount: number }[] }
    | { kind: 'stack_save' }
    | { kind: 'apm' }
  skillDetailTooltip?: string
}): CreationLedgerLine {
  const tooltipSpec: LedgerTooltipSpec | undefined = !input.tooltip
    ? undefined
    : input.tooltip.kind === 'stack_combat'
      ? {
          kind: 'stack_combat',
          terms: input.stack,
          skillEntries: input.tooltip.skillEntries,
          traitEntries: input.tooltip.traitEntries,
        }
      : input.tooltip.kind === 'apm'
        ? { kind: 'apm', terms: input.stack }
        : { kind: 'stack_save', terms: input.stack }

  return buildCreationLedgerLine({
    label: input.label,
    value: input.value,
    valueModified: input.valueModified,
    tooltip: tooltipSpec,
  })
}

export function buildExceptionalStackLedgerLine(input: {
  label: string
  stack: readonly StatStackTerm[]
  value: string
  valueModified?: boolean
}): CreationLedgerLine {
  const hasTooltip = statStackTotal(input.stack) !== 0
  return buildStackBonusLedgerLine({
    label: input.label,
    stack: input.stack,
    value: input.value,
    valueModified: input.valueModified ?? hasTooltip,
    tooltip: hasTooltip ? { kind: 'stack_save' } : undefined,
  })
}

export function buildFlatSourceLedgerLine(input: {
  label: string
  value: string
  sourceLabel: string
  amount: number
  valueModified?: boolean
  hint?: string
}): CreationLedgerLine {
  const showTooltip = input.amount !== 0
  return buildCreationLedgerLine({
    label: input.label,
    value: input.value,
    hint: input.hint,
    valueModified: input.valueModified ?? showTooltip,
    tooltip: showTooltip
      ? {
          kind: 'stack_flat',
          breakdown: [{ label: input.sourceLabel, amount: input.amount }],
        }
      : undefined,
  })
}

export function buildNaturalArmorLedgerLine(
  label: string,
  stack: readonly StatStackTerm[],
): CreationLedgerLine {
  const total = statStackTotal(stack)
  return buildCreationLedgerLine({
    label,
    value: total > 0 ? String(total) : '—',
    valueModified: total > 0,
    tooltip: total > 0 ? { kind: 'stack_save', terms: stack } : { kind: 'none' },
  })
}
