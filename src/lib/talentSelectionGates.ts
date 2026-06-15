import { getMorphusTableById } from '../data/library/morphusTableCatalogLoader'
import {
  buildMorphusSlotTree,
  flattenMorphusSlotNodes,
  readMorphusChoiceBranchTableId,
} from './morphusSlotResolution'
import type {
  MorphusForgeSlotState,
  MorphusForgeState,
  PalladiumOcc,
  PalladiumTalent,
  TalentPrerequisite,
} from '../types'

export const CREATION_CHARACTER_LEVEL = 1

export type TalentCatalogTier = 'common' | 'elite'

export type TalentSelectionGateResult = {
  selectable: boolean
  locked: boolean
  reason?: string
  /** Elite list hide filter — structured Morphus table prerequisites not met. */
  morphusTraitMismatch?: boolean
}

export type TalentSelectionGateContext = {
  characterLevel: number
  morphusTableIds: ReadonlySet<string>
  selectedTalentIds: readonly string[]
  activeOcc?: PalladiumOcc
  spellCap: number
}

export function talentCatalogTier(talent: PalladiumTalent): TalentCatalogTier {
  const tier = talent.talentTier ?? talent.tier ?? 'common'
  return tier === 'elite' ? 'elite' : 'common'
}

export function collectCharacterMorphusTableIds(
  forgeState: MorphusForgeState,
  slotState: MorphusForgeSlotState | undefined,
): Set<string> {
  const ids = new Set<string>()

  for (const tableId of Object.values(slotState?.branchTableIds ?? {})) {
    const trimmed = tableId.trim()
    if (trimmed) ids.add(trimmed)
  }

  const nodes = buildMorphusSlotTree(forgeState, slotState)
  for (const node of flattenMorphusSlotNodes(nodes)) {
    const branchId = readMorphusChoiceBranchTableId(slotState, node.path)
    if (branchId?.trim()) ids.add(branchId.trim())

    if (
      node.tableId &&
      node.tableId !== 'characteristics' &&
      (node.status === 'complete' || node.resolvedEntryId)
    ) {
      ids.add(node.tableId)
    }
  }

  return ids
}

function morphusTableLabel(tableId: string): string {
  return getMorphusTableById(tableId)?.displayName ?? tableId
}

export function readStructuredMorphusTablePrerequisites(
  talent: PalladiumTalent,
): readonly string[] {
  const pre = talent.prerequisites
  if (pre && !Array.isArray(pre) && pre.morphusTableIds?.length) {
    return pre.morphusTableIds
  }
  return []
}

export function readProseMorphusPrerequisites(talent: PalladiumTalent): readonly string[] {
  const block = talent.limitations?.morphusTablePrerequisites
  if (!Array.isArray(block)) return []
  return block.filter((line): line is string => typeof line === 'string' && line.trim().length > 0)
}

function minimumTalentLevel(talent: PalladiumTalent): number {
  let min = talent.limitations?.minimumCharacterLevelToAcquire ?? 1
  const pre = talent.prerequisites
  if (Array.isArray(pre)) {
    for (const row of pre) {
      if (row.type === 'level_minimum' && typeof row.level === 'number') {
        min = Math.max(min, row.level)
      }
    }
  }
  return min
}

/** Minimum character level to acquire (defaults to 1 when unset). */
export function talentMinimumLevelRequirement(talent: PalladiumTalent): number {
  return minimumTalentLevel(talent)
}

export type TalentListSectionRow<TEntry> = {
  kind: 'available' | 'level_gate'
  level?: number
  label: string
  entries: readonly TEntry[]
}

/** Available (no level gate above 1) first, then ascending level-gate groups — alpha within each. */
export function groupEntriesByTalentLevelGate<TEntry extends { talent: PalladiumTalent }>(
  entries: readonly TEntry[],
): TalentListSectionRow<TEntry>[] {
  const byLevel = new Map<number, TEntry[]>()
  for (const entry of entries) {
    const level = talentMinimumLevelRequirement(entry.talent)
    const bucket = byLevel.get(level) ?? []
    bucket.push(entry)
    byLevel.set(level, bucket)
  }

  const sortAlpha = (a: TEntry, b: TEntry) =>
    a.talent.name.localeCompare(b.talent.name)

  const sections: TalentListSectionRow<TEntry>[] = []
  const available = byLevel.get(1) ?? []
  if (available.length > 0) {
    sections.push({
      kind: 'available',
      label: 'Available now',
      entries: [...available].sort(sortAlpha),
    })
  }

  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    if (level <= 1) continue
    const group = byLevel.get(level) ?? []
    if (group.length === 0) continue
    sections.push({
      kind: 'level_gate',
      level,
      label: `Level ${level} required`,
      entries: [...group].sort(sortAlpha),
    })
  }

  return sections
}

function prerequisiteBlockers(
  talent: PalladiumTalent,
  ctx: TalentSelectionGateContext,
): string[] {
  const pre = talent.prerequisites
  if (!Array.isArray(pre)) return []
  const blockers: string[] = []
  for (const row of pre) {
    const label = prerequisiteLabel(row)
    if (row.type === 'level_minimum' && typeof row.level === 'number') {
      if (ctx.characterLevel < row.level) blockers.push(label)
    } else if (row.type === 'attribute_minimum') {
      blockers.push(label)
    } else if (row.type === 'talent' && row.talentId) {
      if (!ctx.selectedTalentIds.includes(row.talentId)) blockers.push(label)
    } else if (row.type === 'other_talent_any_of' && row.talentIds?.length) {
      if (!row.talentIds.some((id) => ctx.selectedTalentIds.includes(id))) {
        blockers.push(label)
      }
    }
  }
  return blockers
}

function prerequisiteLabel(row: TalentPrerequisite): string {
  if (row.label?.trim()) return row.label.trim()
  switch (row.type) {
    case 'level_minimum':
      return `Requires character level ${row.level ?? '?'}.`
    case 'talent':
      return `Requires talent: ${row.talentId ?? 'unknown'}.`
    case 'other_talent_any_of':
      return 'Requires another prerequisite talent.'
    case 'attribute_minimum':
      return `Requires minimum ${row.attribute?.toUpperCase() ?? 'attribute'} ${row.minimum ?? '?'}.`
    default:
      return 'Prerequisite not met.'
  }
}

export function assessTalentSelectionGate(
  talent: PalladiumTalent,
  ctx: TalentSelectionGateContext,
): TalentSelectionGateResult {
  const incompatible = talent.incompatibleTalentIds ?? []
  const conflict = incompatible.find((id) => ctx.selectedTalentIds.includes(id))
  if (conflict) {
    return {
      selectable: false,
      locked: true,
      reason: 'Incompatible with another selected talent.',
    }
  }

  const minLevel = minimumTalentLevel(talent)
  if (ctx.characterLevel < minLevel) {
    return {
      selectable: false,
      locked: true,
      reason: `Requires character level ${minLevel}.`,
    }
  }

  const structuredTables = readStructuredMorphusTablePrerequisites(talent)
  if (structuredTables.length > 0) {
    const match = structuredTables.some((id) => ctx.morphusTableIds.has(id))
    if (!match) {
      const labels = structuredTables.map(morphusTableLabel).join(' or ')
      return {
        selectable: false,
        locked: true,
        morphusTraitMismatch: true,
        reason: `Requires Morphus traits from: ${labels}.`,
      }
    }
  }

  const proseMorphus = readProseMorphusPrerequisites(talent)
  if (proseMorphus.length > 0 && structuredTables.length === 0) {
    return {
      selectable: false,
      locked: true,
      reason: proseMorphus.join(' '),
    }
  }

  const prereqBlockers = prerequisiteBlockers(talent, ctx)
  if (prereqBlockers.length > 0) {
    return {
      selectable: false,
      locked: true,
      reason: prereqBlockers[0],
    }
  }

  return { selectable: true, locked: false }
}
