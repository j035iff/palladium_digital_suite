/**
 * Canonical live-ledger row resolution (Pillar 9).
 *
 * Every stat is resolved once into {@link ResolvedLedgerRow} with a flat
 * {@link LedgerContribution} list. All UI surfaces (value tooltip, dice sub-row,
 * Review tab pending blocks, future views) project from that list — never
 * re-gather sources.
 */
import type { ForgeAttrKey } from './attributeKeys'
import {
  buildLedgerDiceGroup,
  type LedgerDiceContribution,
  type LedgerFlatContribution,
  type LedgerStatDiceGroup,
} from './ledgerStatBonuses'
import { flatBonusesFromDiceContributions } from './creationPhysicalDice'
import {
  buildCreationLedgerLine,
  buildStackBonusLedgerLine,
  buildVitalityLedgerLineFromBlock,
  type CreationLedgerLine,
  type LedgerTooltipSpec,
} from './ledgerLineBuilder'
import type { StatStackTerm } from './creationStatEngine'
import type { VitalAttrFlatTerm } from './ledgerVitalFormula'
import type { PendingDiceBlock } from './spawnDiceBlocks'
import { FACADE_LABEL } from './creationFormLabels'

export type LedgerFormScope = 'facade' | 'morphus' | 'neutral'

export type LedgerRowSection =
  | 'attribute'
  | 'vitality'
  | 'save'
  | 'combat'
  | 'exceptional'
  | 'other'

export type LedgerContributionKind =
  | 'pool_roll'
  | 'flat'
  | 'occ_variable'
  | 'vital_flat'
  | 'skill_flat'
  | 'dice_pending'
  | 'dice_entered'
  | 'stack'
  | 'facade_base'

export type LedgerDiceBucket = LedgerStatDiceGroup['kind']

export type LedgerContribution = {
  kind: LedgerContributionKind
  scope: LedgerFormScope
  label: string
  amount?: number
  notation?: string
  bucket?: LedgerDiceBucket
  rollId?: string
  resolvedAmount?: number
  stackBucket?: StatStackTerm['bucket']
}

export type ResolvedLedgerRow = {
  id: string
  label: string
  formScope: LedgerFormScope
  section: LedgerRowSection
  contributions: LedgerContribution[]
  total: number | null
  valueDisplay?: string
  valueModified?: boolean
  labelSuffix?: string
  inlineRaceRoll?: string
  hint?: string
  vitalFlatTerms?: VitalAttrFlatTerm[]
  skillFlatTerms?: LedgerFlatContribution[]
  morphusFacadeSdc?: number
  labelTooltip?: string
  /** Review-tab flat baseline when it differs from display total (Morphus attrs). */
  pendingFlatBaseline?: number
  /** Vitality blocks carry a pre-built flat tooltip (formula / S.D.C. paths). */
  precomputedFlatTooltip?: string
}

export type LedgerRowProjectionInput = {
  resolutions?: Readonly<Record<string, number>>
  pendingBlock?: PendingDiceBlock
  unassignedValue?: string
  /** When Morphus matches Facade and has no morphus-only signal, reuse Facade tooltip. */
  facadeValueTooltip?: string
  /** Override pending-roll signal (Review tab block vs row contributions). */
  hasPendingRolls?: boolean
}

export function projectDiceGroups(row: ResolvedLedgerRow): LedgerStatDiceGroup[] {
  const byBucket = new Map<LedgerDiceBucket, LedgerDiceContribution[]>()
  for (const c of row.contributions) {
    if (
      (c.kind !== 'dice_pending' && c.kind !== 'dice_entered') ||
      c.scope !== row.formScope ||
      !c.bucket ||
      !c.notation?.trim()
    ) {
      continue
    }
    const list = byBucket.get(c.bucket) ?? []
    list.push({ notation: c.notation, label: c.label })
    byBucket.set(c.bucket, list)
  }
  const groups: LedgerStatDiceGroup[] = []
  for (const kind of ['race', 'occ', 'skills', 'traits'] as const) {
    const contribs = byBucket.get(kind)
    if (!contribs?.length) continue
    const group = buildLedgerDiceGroup(kind, contribs)
    if (group) groups.push(group)
  }
  return groups
}

export function rowHasPendingDice(
  row: ResolvedLedgerRow,
  resolutions: Readonly<Record<string, number>> = {},
): boolean {
  return row.contributions.some(
    (c) =>
      c.kind === 'dice_pending' &&
      c.scope === row.formScope &&
      c.rollId != null &&
      resolutions[c.rollId] == null,
  )
}

function flatBreakdownFromContributions(
  row: ResolvedLedgerRow,
  scopes: readonly LedgerFormScope[],
  includeEnteredDice = false,
): LedgerFlatContribution[] {
  return row.contributions
    .filter(
      (c) =>
        (c.kind === 'flat' ||
          c.kind === 'skill_flat' ||
          c.kind === 'occ_variable' ||
          (includeEnteredDice && c.kind === 'dice_entered')) &&
        scopes.includes(c.scope) &&
        (c.resolvedAmount ?? c.amount ?? 0) !== 0,
    )
    .map((c) => ({
      label: c.label,
      amount: c.resolvedAmount ?? c.amount ?? 0,
      notation: c.kind === 'dice_entered' ? undefined : c.notation,
    }))
}

export function sumResolvedRowTotal(
  row: ResolvedLedgerRow,
  scopes: readonly LedgerFormScope[] = [row.formScope],
): number {
  let sum = 0
  for (const c of row.contributions) {
    if (!scopes.includes(c.scope)) continue
    switch (c.kind) {
      case 'pool_roll':
      case 'flat':
      case 'occ_variable':
      case 'skill_flat':
      case 'vital_flat':
      case 'facade_base':
        sum += c.amount ?? 0
        break
      case 'dice_entered':
        sum += c.resolvedAmount ?? c.amount ?? 0
        break
      case 'dice_pending':
        break
      case 'stack':
        sum += c.amount ?? 0
        break
    }
  }
  return sum
}

export function projectAttributeTooltipSpec(
  row: ResolvedLedgerRow,
  resolutions: Readonly<Record<string, number>>,
  hasPendingRolls?: boolean,
): LedgerTooltipSpec {
  const poolRoll =
    row.contributions.find((c) => c.kind === 'pool_roll' && c.scope === 'facade')
      ?.amount ?? null
  const flatBreakdown = flatBreakdownFromContributions(row, ['facade'])
  const occVariableBonus =
    row.contributions.find(
      (c) => c.kind === 'occ_variable' && c.scope === 'facade',
    )?.amount ?? 0
  const enteredDice = row.contributions
    .filter((c) => c.kind === 'dice_entered' && c.scope === 'facade')
    .map((c) => ({
      label: c.label,
      amount: c.resolvedAmount ?? c.amount ?? 0,
    }))
  return {
    kind: 'facade_attribute',
    poolRoll,
    flatBreakdown,
    occVariableBonus,
    enteredDice,
    pendingRolls: hasPendingRolls ?? rowHasPendingDice(row, resolutions),
  }
}

export function projectMorphusAttributeTooltipSpec(
  row: ResolvedLedgerRow,
  facadeTotal: number | null,
  resolutions: Readonly<Record<string, number>>,
): LedgerTooltipSpec | undefined {
  if (facadeTotal == null) return undefined
  const deltas = flatBreakdownFromContributions(row, ['morphus'], true)
  const morphusOnlyPending = rowHasPendingDice(row, resolutions)
  const hasMorphusDice = row.contributions.some(
    (c) =>
      (c.kind === 'dice_pending' || c.kind === 'dice_entered') &&
      c.scope === 'morphus',
  )
  if (deltas.length === 0 && !morphusOnlyPending && !hasMorphusDice && facadeTotal === row.total) {
    return undefined
  }
  return {
    kind: 'morphus_relative',
    facadeTotal,
    deltas,
    pendingRolls: morphusOnlyPending,
  }
}

export function projectVitalityTooltipSpec(
  row: ResolvedLedgerRow,
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
): LedgerTooltipSpec {
  return {
    kind: 'vitality_block',
    flatTerms: row.vitalFlatTerms ?? block?.flatTerms ?? [],
    block,
    resolutions,
    skillFlats: row.skillFlatTerms ?? block?.skillFlatTerms ?? [],
    pendingRolls: rowHasPendingDice(row, resolutions),
  }
}

export function projectFacadeAttributeLine(
  row: ResolvedLedgerRow,
  input: LedgerRowProjectionInput = {},
): CreationLedgerLine {
  const resolutions = input.resolutions ?? {}
  const unassigned = input.unassignedValue ?? '—'
  const hasPendingRolls =
    input.hasPendingRolls ?? rowHasPendingDice(row, resolutions)
  return buildCreationLedgerLine({
    label: row.label,
    labelSuffix: row.labelSuffix,
    inlineRaceRoll: row.inlineRaceRoll,
    value: row.valueDisplay ?? (row.total != null ? String(row.total) : unassigned),
    valueModified: row.valueModified,
    hasPendingRolls,
    diceGroups: projectDiceGroups(row),
    tooltip: projectAttributeTooltipSpec(row, resolutions, hasPendingRolls),
  })
}

export function projectMorphusAttributeLine(
  row: ResolvedLedgerRow,
  facadeTotal: number | null,
  input: LedgerRowProjectionInput = {},
): CreationLedgerLine {
  const resolutions = input.resolutions ?? {}
  const morphusTooltip = projectMorphusAttributeTooltipSpec(row, facadeTotal, resolutions)
  return buildCreationLedgerLine({
    label: row.label,
    labelSuffix: row.labelSuffix,
    value: row.valueDisplay ?? (row.total != null ? String(row.total) : '—'),
    valueModified: row.valueModified,
    hasPendingRolls: rowHasPendingDice(row, resolutions),
    diceGroups: projectDiceGroups(row),
    tooltip:
      morphusTooltip ??
      (input.facadeValueTooltip
        ? { kind: 'rendered', text: input.facadeValueTooltip }
        : undefined),
  })
}

export function projectVitalityLine(
  row: ResolvedLedgerRow,
  input: LedgerRowProjectionInput = {},
): CreationLedgerLine {
  const resolutions = input.resolutions ?? {}
  const block = input.pendingBlock
  return buildVitalityLedgerLineFromBlock(row.label, block, resolutions, {
    label: row.label,
    value:
      row.valueDisplay ??
      (row.total != null && row.total > 0 ? String(row.total) : '—'),
    valueModified: row.valueModified,
    hint: row.hint,
    flatTerms: row.vitalFlatTerms,
    skillFlatTerms: row.skillFlatTerms,
    morphusFacadeSdc: row.morphusFacadeSdc,
    tooltip: projectVitalityTooltipSpec(row, block, resolutions),
  })
}

export function projectStackLine(input: {
  row: ResolvedLedgerRow
  stack: readonly StatStackTerm[]
  value: string
  tooltipKind: 'stack_combat' | 'stack_save' | 'apm'
  skillEntries?: readonly { name: string; amount: number }[]
  traitEntries?: readonly { name: string; amount: number }[]
}): CreationLedgerLine {
  return buildStackBonusLedgerLine({
    label: input.row.label,
    stack: input.stack,
    value: input.value,
    valueModified: input.row.valueModified,
    tooltip:
      input.tooltipKind === 'stack_combat'
        ? {
            kind: 'stack_combat',
            skillEntries: input.skillEntries,
            traitEntries: input.traitEntries,
          }
        : input.tooltipKind === 'apm'
          ? { kind: 'apm' }
          : { kind: 'stack_save' },
  })
}

export function resolveStackLedgerRow(input: {
  id: string
  label: string
  formScope?: LedgerFormScope
  section: LedgerRowSection
  stack: readonly StatStackTerm[]
  valueDisplay: string
  valueModified?: boolean
}): ResolvedLedgerRow {
  const contributions: LedgerContribution[] = input.stack
    .filter((t) => t.amount !== 0)
    .map((t) => ({
      kind: 'stack' as const,
      scope: input.formScope ?? 'neutral',
      label: t.label,
      amount: t.amount,
      stackBucket: t.bucket,
    }))
  return {
    id: input.id,
    label: input.label,
    formScope: input.formScope ?? 'neutral',
    section: input.section,
    contributions,
    total: input.stack.reduce((s, t) => s + t.amount, 0),
    valueDisplay: input.valueDisplay,
    valueModified: input.valueModified,
  }
}

const VITALITY_BLOCK_IDS = new Set([
  'hp',
  'sdc',
  'ppe',
  'isp',
  'morphus_hp',
  'morphus_sdc',
  'morphus_hf',
])

export function vitalityFormScopeForBlockId(blockId: string): LedgerFormScope {
  return blockId.startsWith('morphus_') ? 'morphus' : 'facade'
}

/** Project a vitality {@link PendingDiceBlock} into the canonical row model. */
export function resolvedVitalityRowFromBlock(
  block: PendingDiceBlock,
  resolutions: Readonly<Record<string, number>> = {},
): ResolvedLedgerRow {
  const formScope = vitalityFormScopeForBlockId(block.id)
  const contributions: LedgerContribution[] = []

  for (const group of block.groups) {
    for (const roll of group.rolls) {
      addDiceContribution(contributions, {
        scope: formScope,
        bucket: group.kind,
        label: roll.source,
        notation: roll.notation,
        rollId: roll.id,
        resolvedAmount: resolutions[roll.id],
      })
    }
  }

  let total = block.flatBaseline
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value != null && Number.isFinite(value)) total += value
    }
  }

  return {
    id: block.id,
    label: block.label,
    formScope,
    section: 'vitality',
    contributions,
    total,
    pendingFlatBaseline: block.flatBaseline,
    vitalFlatTerms: block.flatTerms,
    skillFlatTerms: block.skillFlatTerms,
    morphusFacadeSdc: block.morphusFacadeSdc,
    hint: block.hint,
    precomputedFlatTooltip: block.flatTooltip,
    valueModified:
      block.flatBaseline > 0 ||
      block.groups.some((group) => group.rolls.length > 0) ||
      (block.flatTerms?.length ?? 0) > 0,
  }
}

export function isVitalityPendingBlockId(blockId: string): boolean {
  return VITALITY_BLOCK_IDS.has(blockId)
}

export function addDiceContribution(
  contributions: LedgerContribution[],
  input: {
    scope: LedgerFormScope
    bucket: LedgerDiceBucket
    label: string
    notation: string
    rollId: string
    resolvedAmount?: number | null
  },
): void {
  const entered =
    input.resolvedAmount != null && Number.isFinite(input.resolvedAmount)
  contributions.push({
    kind: entered ? 'dice_entered' : 'dice_pending',
    scope: input.scope,
    bucket: input.bucket,
    label: input.label,
    notation: input.notation,
    rollId: input.rollId,
    resolvedAmount: entered ? input.resolvedAmount! : undefined,
    amount: entered
      ? input.resolvedAmount!
      : flatBonusesFromDiceContributions([
          { notation: input.notation, label: input.label },
        ]),
  })
}

export type CreationLedgerResolutionContext = {
  facade: {
    attributes: Partial<Record<ForgeAttrKey, ResolvedLedgerRow>>
    vitals: Partial<Record<string, ResolvedLedgerRow>>
  }
  morphus: {
    attributes: Partial<Record<ForgeAttrKey, ResolvedLedgerRow>>
    vitals: Partial<Record<string, ResolvedLedgerRow>>
  }
  pendingBlocks: PendingDiceBlock[]
}
