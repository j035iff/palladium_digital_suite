import type {
  MorphusForgeSlotState,
  MorphusForgeState,
  MorphusSlotNode,
} from '../types'
import {
  buildMorphusSlotTree,
  deriveMorphusSlotResolutionView,
  flattenMorphusSlotNodes,
  rootMorphusSlotPlan,
} from './morphusSlotResolution'
import { getMorphusTableById } from '../data/library/morphusTableCatalogLoader'
import {
  MORPHUS_APPEARANCE_ROUTING_TABLE,
  MORPHUS_FORGE_MANIFEST,
} from '../data/library/morphusForgeRoutingLoader'
import type { MorphusForgeSlotRequirement } from '../types'

export type MorphusTraitPanelSlotBox = {
  planIndex: number
  title: string
  bulletDetails?: string[]
  resolvedPicks: string[]
  complete: boolean
  planPath: string
}

export type MorphusCharacteristicPickTreeEntry = {
  name: string
  depth: number
  complete: boolean
}

export type MorphusCharacteristicPickTree = {
  planIndex: number
  planPath: string
  heading: string
  entries: MorphusCharacteristicPickTreeEntry[]
  complete: boolean
}

export type MorphusTraitPanelPathSection = {
  path: 'appearance' | 'characteristics'
  title: string
  subtitle?: string
  active: boolean
  configured: boolean
  boxes: MorphusTraitPanelSlotBox[]
  characteristicTrees: MorphusCharacteristicPickTree[]
}

function tableLabel(tableId: string, fallback?: string): string {
  if (tableId === 'characteristics') return 'Characteristics'
  return getMorphusTableById(tableId)?.displayName ?? fallback ?? tableId
}

export function defaultMorphusTraitPanelPlaceholderBoxes(): MorphusTraitPanelSlotBox[] {
  return [0, 1].map((planIndex) => ({
    planIndex,
    title: `Trait Table ${planIndex + 1}`,
    resolvedPicks: [],
    complete: false,
    planPath: `plan:${planIndex}`,
  }))
}

export function morphusSlotPlanPanelBoxes(
  slotPlan: readonly MorphusForgeSlotRequirement[],
): Omit<MorphusTraitPanelSlotBox, 'resolvedPicks' | 'complete' | 'planPath'>[] {
  return slotPlan.map((slot, planIndex) => {
    switch (slot.kind) {
      case 'required':
        return {
          planIndex,
          title: slot.label ?? tableLabel(slot.tableId),
        }
      case 'choice':
        return {
          planIndex,
          title: slot.options.map((o) => o.label ?? tableLabel(o.tableId)).join(' OR '),
        }
      case 'combination_pool':
        return {
          planIndex,
          title: `${slot.countRoll.notation} of`,
          bulletDetails: slot.pool.map((p) => p.label ?? tableLabel(p.tableId)),
        }
      case 'repeat':
        return {
          planIndex,
          title: `${slot.count}× ${slot.label ?? tableLabel(slot.tableId)}`,
        }
      case 'characteristics_multiplier':
        return {
          planIndex,
          title: `${slot.count}× Characteristics`,
        }
      default:
        return {
          planIndex,
          title: `Trait Table ${planIndex + 1}`,
        }
    }
  })
}

const RESOLVED_PICK_NODE_KINDS = new Set<MorphusSlotNode['kind']>([
  'table',
  'characteristic',
  'variant_choice',
  'sub_trait_choice',
  'choice',
])

function collectResolvedPickNames(node: MorphusSlotNode | undefined): string[] {
  if (!node) return []
  const names: string[] = []
  for (const slotNode of flattenMorphusSlotNodes([node])) {
    if (!slotNode.resolvedEntryName) continue
    if (!RESOLVED_PICK_NODE_KINDS.has(slotNode.kind)) continue
    const name = slotNode.resolvedEntryName.trim()
    if (!name) continue
    if (names[names.length - 1] !== name) names.push(name)
  }
  return names
}

function slotNodeComplete(node: MorphusSlotNode | undefined): boolean {
  if (!node) return false
  if (node.status === 'incomplete_custom' || node.status === 'ready' || node.status === 'blocked') {
    return false
  }
  return node.children.every((child) => slotNodeComplete(child))
}

function enrichBoxesFromSlotTree(
  boxes: Omit<MorphusTraitPanelSlotBox, 'resolvedPicks' | 'complete' | 'planPath'>[],
  rootNodes: readonly MorphusSlotNode[],
): MorphusTraitPanelSlotBox[] {
  return boxes.map((box) => {
    const node = rootNodes[box.planIndex]
    return {
      ...box,
      planPath: node?.path ?? `plan:${box.planIndex}`,
      resolvedPicks: collectResolvedPickNames(node),
      complete: slotNodeComplete(node),
    }
  })
}

const PICK_TREE_NAME_KINDS = new Set<MorphusSlotNode['kind']>([
  'characteristic',
  'table',
  'variant_choice',
  'sub_trait_choice',
  'choice',
])

export function collectMorphusCharacteristicPickTree(
  node: MorphusSlotNode,
  depth = 0,
): MorphusCharacteristicPickTreeEntry[] {
  const entries: MorphusCharacteristicPickTreeEntry[] = []
  let nextDepth = depth

  if (node.resolvedEntryName && PICK_TREE_NAME_KINDS.has(node.kind)) {
    entries.push({
      name: node.resolvedEntryName,
      depth,
      complete: node.status === 'complete',
    })
    nextDepth = depth + 1
  }

  for (const child of node.children) {
    entries.push(...collectMorphusCharacteristicPickTree(child, nextDepth))
  }

  return entries
}

function buildCharacteristicPickTrees(
  rootNodes: readonly MorphusSlotNode[],
): MorphusCharacteristicPickTree[] {
  return rootNodes.map((node, planIndex) => {
    const entries = collectMorphusCharacteristicPickTree(node)
    const heading =
      entries.length > 0
        ? 'Characteristics'
        : node.label || `Characteristic ${planIndex + 1}`

    return {
      planIndex,
      planPath: node.path,
      heading,
      entries,
      complete: slotNodeComplete(node),
    }
  })
}

function appearanceSection(
  forgeState: MorphusForgeState,
  rootNodes: readonly MorphusSlotNode[],
): MorphusTraitPanelPathSection {
  const entry = forgeState.appearanceEntryId
    ? MORPHUS_APPEARANCE_ROUTING_TABLE.entries.find(
        (row) => row.id === forgeState.appearanceEntryId,
      )
    : undefined
  const configured = Boolean(entry)
  const planBoxes = configured
    ? morphusSlotPlanPanelBoxes(entry!.slotPlan)
    : defaultMorphusTraitPanelPlaceholderBoxes().map(({ planIndex, title }) => ({
        planIndex,
        title,
      }))

  return {
    path: 'appearance',
    title: 'Appearance Archetype',
    subtitle: entry?.name,
    active: true,
    configured,
    boxes: enrichBoxesFromSlotTree(planBoxes, rootNodes),
    characteristicTrees: [],
  }
}

function characteristicsSection(
  forgeState: MorphusForgeState,
  rootNodes: readonly MorphusSlotNode[],
): MorphusTraitPanelPathSection {
  const count = forgeState.characteristicsPickCount
  const configured = count != null
  const countRoll = MORPHUS_FORGE_MANIFEST.path2.countRoll
  const planBoxes = configured
    ? morphusSlotPlanPanelBoxes(rootMorphusSlotPlan(forgeState))
    : [
        {
          planIndex: 0,
          title: `${countRoll.notation} Characteristics`,
        },
      ]

  return {
    path: 'characteristics',
    title: 'Personality Traits',
    subtitle:
      configured && count != null
        ? `${count} characteristic pick${count === 1 ? '' : 's'}`
        : undefined,
    active: true,
    configured,
    boxes: enrichBoxesFromSlotTree(planBoxes, rootNodes),
    characteristicTrees: configured ? buildCharacteristicPickTrees(rootNodes) : [],
  }
}

export function buildMorphusSelectedTraitsPanelSections(
  forgeState: MorphusForgeState,
  slotState: MorphusForgeSlotState | undefined,
): MorphusTraitPanelPathSection[] {
  if (!forgeState.path) return []

  const rootNodes =
    rootMorphusSlotPlan(forgeState).length > 0
      ? buildMorphusSlotTree(forgeState, slotState)
      : []

  if (forgeState.path === 'appearance') {
    return [appearanceSection(forgeState, rootNodes)]
  }
  return [characteristicsSection(forgeState, rootNodes)]
}

export function morphusSelectedTraitsPanelSlotsRemaining(
  forgeState: MorphusForgeState,
  slotState: MorphusForgeSlotState | undefined,
): number {
  if (!forgeState.path) return 0
  const view = deriveMorphusSlotResolutionView(forgeState, slotState)
  return view.blockers.length
}
