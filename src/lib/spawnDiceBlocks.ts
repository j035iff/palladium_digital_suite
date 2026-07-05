import type { Character, PalladiumOcc, Race } from '../types'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from './attributeKeys'
import { resolveCreationOccSkillIds } from './occCoreSkillVouchers'
import {
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import {
  type LedgerFlatContribution,
} from './ledgerStatBonuses'
import {
  formatVitalLedgerTooltip,
  formatMorphusSdcValueTooltip,
  resolveIspCreationFormula,
  type VitalAttrFlatTerm,
  type VitalDiceTooltipTerm,
} from './ledgerVitalFormula'
import { resolveCreationLedgerBundle, resolveFacadeAttributeRows } from './resolveCreationLedgerContext'
import type { CreationLedgerResolutionContext } from './ledgerRowResolution'
import { resolveVitalityLedgerRows } from './resolveVitalityLedgerRows'

export type PendingDiceRoll = {
  id: string
  notation: string
  min: number
  max: number
  source: string
}

export type PendingDiceGroup = {
  kind: 'race' | 'occ' | 'skills' | 'traits'
  display: string
  tooltip: string
  rolls: PendingDiceRoll[]
}

export type PendingDiceBlock = {
  id: string
  label: string
  flatBaseline: number
  flatTooltip?: string
  flatTerms?: VitalAttrFlatTerm[]
  skillFlatTerms?: LedgerFlatContribution[]
  /** Facade S.D.C. total carried into Morphus S.D.C. (dual-form only). */
  morphusFacadeSdc?: number
  hint?: string
  groups: PendingDiceGroup[]
}

export function pendingDiceBlocksById(
  blocks: readonly PendingDiceBlock[],
): Record<string, PendingDiceBlock> {
  return Object.fromEntries(blocks.map((block) => [block.id, block]))
}

/** Authoritative creation total for a pending dice block (Review + Live Ledger). */
export function creationPendingBlockTotal(
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
): number | null {
  if (!block) return null
  const hasRolls = block.groups.some((group) => group.rolls.length > 0)
  if (block.flatBaseline <= 0 && !hasRolls) return null
  return pendingDiceBlockRunningTotal(block, resolutions)
}

/** Sum entered Morphus trait attribute dice from Review resolutions. */
export function sumMorphusTraitAttributeDiceBonuses(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, number>> {
  const out: Partial<Record<ForgeAttrKey, number>> = {}
  for (const block of blocks) {
    if (!block.id.startsWith('morphus_attr_')) continue
    const attr = block.id.slice('morphus_attr_'.length) as ForgeAttrKey
    if (!FORGE_ATTRIBUTE_KEYS.includes(attr)) continue
    let sum = 0
    for (const group of block.groups) {
      for (const roll of group.rolls) {
        const value = resolutions[roll.id]
        if (value != null && Number.isFinite(value)) sum += value
      }
    }
    if (sum !== 0) out[attr] = sum
  }
  return out
}

/** Per-trait entered Morphus attribute dice for ledger tooltips. */
export function morphusTraitAttributeDiceBreakdown(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> {
  const out: Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> = {}
  for (const block of blocks) {
    if (!block.id.startsWith('morphus_attr_')) continue
    const attr = block.id.slice('morphus_attr_'.length) as ForgeAttrKey
    if (!FORGE_ATTRIBUTE_KEYS.includes(attr)) continue
    const rolls = collectEnteredPendingDiceContributions(block, resolutions)
    if (rolls.length > 0) out[attr] = rolls
  }
  return out
}

/** Sum entered Morphus trait Horror Factor dice from Review resolutions. */
export function sumMorphusTraitHorrorFactorDiceBonus(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): number {
  const block = blocks.find((row) => row.id === 'morphus_hf')
  if (!block) return 0
  let sum = 0
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value != null && Number.isFinite(value)) sum += value
    }
  }
  return sum
}

/** Entered vitality dice with Race / O.C.C. / per-level labels for ledger tooltips. */
export function collectVitalityDiceTooltipTerms(
  block: PendingDiceBlock,
  resolutions: Readonly<Record<string, number>>,
): VitalDiceTooltipTerm[] {
  const out: VitalDiceTooltipTerm[] = []
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value == null || !Number.isFinite(value)) continue
      if (roll.id.includes('.per_level.')) {
        out.push({ kind: 'perLevel', notation: roll.notation, amount: value })
        continue
      }
      if (group.kind === 'race') {
        out.push({ kind: 'raceRoll', notation: roll.notation, amount: value })
      } else if (group.kind === 'occ') {
        out.push({ kind: 'occRoll', notation: roll.notation, amount: value })
      } else {
        out.push({
          kind: 'skillRoll',
          label: roll.source,
          notation: roll.notation,
          amount: value,
        })
      }
    }
  }
  return out
}

export function formatVitalityBlockValueTooltip(
  flatTerms: readonly VitalAttrFlatTerm[],
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
  skillFlats: readonly LedgerFlatContribution[] = [],
): string | undefined {
  const blockSkillFlats = block?.skillFlatTerms ?? []
  const effectiveSkillFlats =
    skillFlats.length > 0 ? skillFlats : blockSkillFlats
  if (block?.id === 'morphus_sdc') {
    return formatMorphusSdcValueTooltip(
      block.morphusFacadeSdc ?? 0,
      block ? collectVitalityDiceTooltipTerms(block, resolutions) : [],
      effectiveSkillFlats,
    )
  }
  const diceTerms = block ? collectVitalityDiceTooltipTerms(block, resolutions) : []
  return formatVitalLedgerTooltip(flatTerms, diceTerms, effectiveSkillFlats)
}

function resolveCreationSkillIds(character: Character, occ?: PalladiumOcc): string[] {
  if (!occ) return []
  return resolveCreationOccSkillIds(
    occ,
    character.occSpecializationId,
    character.creationOccSkillIds ?? [],
    character.creationOccCoreVoucherPicks ?? {},
  )
    .concat(flattenCreationSkillIds(getCreationRelatedPicks(character)))
    .concat(flattenCreationSkillIds(getCreationSecondaryPicks(character)))
}

/** Full resolution bundle — Live Ledger, Review tab, and vitality row projections. */
export function buildCreationLedgerResolutionBundle(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { supportsDualForm?: boolean; psychicTier?: string },
  pendingMorphusTotals?: Partial<Record<ForgeAttrKey, number>>,
): CreationLedgerResolutionContext {
  const assignments = character.creationAttributeAssignments ?? {}
  const occVariableResolutions = character.creationOccVariableResolutions ?? {}
  const pendingDiceResolutions = character.creationPendingDiceResolutions ?? {}
  const psychicTier = opts?.psychicTier ?? 'none'
  const showIsp =
    psychicTier !== 'none' || character.psychicGateBypassed === true
  const skillIds = resolveCreationSkillIds(character, occ)
  const facadeAttributeRows = resolveFacadeAttributeRows(
    character,
    occ,
    skillIds,
    race,
  )
  const pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>> = {}
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const row = facadeAttributeRows[attr]
    if (!row) continue
    const sum = row.contributions
      .filter((c) => c.kind === 'dice_entered' && c.scope === 'facade')
      .reduce((total, c) => total + (c.resolvedAmount ?? 0), 0)
    if (sum !== 0) pendingAttrBonuses[attr] = sum
  }
  const vitality = resolveVitalityLedgerRows({
    character,
    race,
    occ,
    skillIds,
    assignments,
    pendingAttrBonuses,
    occVariableResolutions,
    resolutions: pendingDiceResolutions,
    showIsp,
    supportsDualForm: opts?.supportsDualForm,
    ispFormula: resolveIspCreationFormula(occ, psychicTier, showIsp),
  })

  return resolveCreationLedgerBundle({
    character,
    race,
    occ,
    skillIds,
    supportsDualForm: opts?.supportsDualForm,
    facadeVitals: vitality.facade,
    morphusVitals: vitality.morphus,
    pendingMorphusTotals,
  })
}

/** Spawn dice grouped to mirror the live ledger (flat baseline + Race/OCC/Skills dice rows). */
export function buildPendingDiceBlocks(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { supportsDualForm?: boolean; psychicTier?: string },
): PendingDiceBlock[] {
  return buildCreationLedgerResolutionBundle(character, race, occ, opts).pendingBlocks
}

export type PendingDiceBlockScope = 'primary' | 'morphus' | 'all'

export function filterPendingDiceBlocksByScope(
  blocks: readonly PendingDiceBlock[],
  scope: PendingDiceBlockScope,
): PendingDiceBlock[] {
  if (scope === 'all') return [...blocks]
  if (scope === 'primary') {
    return blocks.filter((block) => !block.id.startsWith('morphus_'))
  }
  return blocks.filter((block) => block.id.startsWith('morphus_'))
}

/** Sum entered spawn attribute dice (skill + post-strip O.C.C.) per forge attribute key. */
export function sumPendingAttributeDiceBonuses(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, number>> {
  const breakdown = pendingAttributeDiceBreakdown(blocks, resolutions)
  const out: Partial<Record<ForgeAttrKey, number>> = {}
  for (const [attr, rolls] of Object.entries(breakdown)) {
    const sum = rolls.reduce((total, roll) => total + roll.amount, 0)
    if (sum !== 0) out[attr as ForgeAttrKey] = sum
  }
  return out
}

/** Per-source entered attribute dice for ledger value tooltips. */
export function pendingAttributeDiceBreakdown(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> {
  const out: Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> = {}
  for (const block of blocks) {
    if (!block.id.startsWith('attr_')) continue
    const attr = block.id.slice('attr_'.length) as ForgeAttrKey
    if (!FORGE_ATTRIBUTE_KEYS.includes(attr)) continue
    const rolls = collectEnteredPendingDiceContributions(block, resolutions)
    if (rolls.length > 0) out[attr] = rolls
  }
  return out
}

/** Entered spawn dice rolls with catalog source labels (for ledger tooltips). */
export function collectEnteredPendingDiceContributions(
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
): LedgerFlatContribution[] {
  if (!block) return []
  const out: LedgerFlatContribution[] = []
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value == null || !Number.isFinite(value)) continue
      out.push({ label: roll.source, amount: value, notation: roll.notation })
    }
  }
  return out
}

export function flattenPendingDiceRolls(
  blocks: readonly PendingDiceBlock[],
): PendingDiceRoll[] {
  return blocks.flatMap((block) => block.groups.flatMap((group) => group.rolls))
}

export function pendingDiceBlockRunningTotal(
  block: PendingDiceBlock,
  resolutions: Readonly<Record<string, number>>,
): number {
  let total = block.flatBaseline
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value != null && Number.isFinite(value)) {
        total += value
      }
    }
  }
  return total
}

/** True when the block has physical dice rows not yet entered on Review. */
export function pendingDiceBlockHasUnresolvedRolls(
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
): boolean {
  if (!block) return false
  return block.groups.some((group) =>
    group.rolls.some((roll) => {
      const value = resolutions[roll.id]
      return value == null || !Number.isFinite(value)
    }),
  )
}

export function pendingDiceBlocksComplete(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): boolean {
  const rolls = flattenPendingDiceRolls(blocks)
  return rolls.every((roll) => {
    const value = resolutions[roll.id]
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= roll.min &&
      value <= roll.max
    )
  })
}

export function formatPendingDiceGroupLabel(kind: PendingDiceGroup['kind']): string {
  return ledgerDiceGroupRowLabel(kind)
}

/** Map pending-dice groups to Live Ledger dice row segments (Race / Traits / etc.). */
export function ledgerDiceGroupsFromPendingGroups(
  groups: readonly PendingDiceGroup[],
): LedgerStatDiceGroup[] {
  return groups.map((group) => ({
    kind: group.kind,
    display: group.display,
    tooltip: group.tooltip.replace(/^\(|\)$/g, ''),
  }))
}
