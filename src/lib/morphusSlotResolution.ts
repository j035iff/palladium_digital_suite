import {
  MORPHUS_APPEARANCE_ROUTING_TABLE,
  MORPHUS_CHARACTERISTICS_ROUTING_TABLE,
  MORPHUS_FORGE_MANIFEST,
} from '../data/library/morphusForgeRoutingLoader'
import {
  getMorphusCharacteristicById,
  getMorphusTableById,
  listMorphusTraitEntriesWithPercentiles,
} from '../data/library/morphusTableCatalogLoader'
import { formatMorphusPercentileBand } from './morphusForgeNavigation'
import {
  buildMorphusVariantPickEntries,
  enrichMorphusTraitPickOption,
  formatMorphusSlotPlanRoute,
  morphusVariantMergedEntryId,
} from './morphusTraitPickDisplay'
import {
  emptyMorphusCustomTraitInstance,
  isMorphusCustomTraitSlotComplete,
  sanitizeMorphusCustomTraitInstance,
} from './morphusCustomTrait'
import type {
  Character,
  MorphusCharacteristic,
  MorphusCustomTraitInstance,
  MorphusForgeSlotRequirement,
  MorphusForgeSlotState,
  MorphusForgeState,
  MorphusForgeTableTarget,
  MorphusSlotNode,
  MorphusSlotPickOption,
  MorphusTraitSlotResolution,
} from '../types'

export const EMPTY_MORPHUS_FORGE_SLOT_STATE: MorphusForgeSlotState = {}

type ResolveOpts = {
  rerollCharacteristicsAbove?: number
}

function normalizeSlotState(state: MorphusForgeSlotState | undefined): MorphusForgeSlotState {
  return state ?? EMPTY_MORPHUS_FORGE_SLOT_STATE
}

function pick(state: MorphusForgeSlotState, path: string): string | undefined {
  return state.picks?.[path]
}

function routingPick(state: MorphusForgeSlotState, path: string): string | undefined {
  return state.routingPicks?.[path]
}

function branchTable(state: MorphusForgeSlotState, path: string): string | undefined {
  return state.branchTableIds?.[path]
}

function diceValue(state: MorphusForgeSlotState, path: string): number | undefined {
  return state.diceValues?.[path]
}

function subTraitPick(state: MorphusForgeSlotState, path: string, index: number): string | undefined {
  return state.subTraitPicks?.[`${path}#${index}`]
}

function variantPick(state: MorphusForgeSlotState, path: string): string | undefined {
  return state.variantPicks?.[path]
}

function customInstance(state: MorphusForgeSlotState, path: string) {
  return state.customInstances?.[path]
}

function nodeComplete(node: MorphusSlotNode): boolean {
  if (node.status === 'incomplete_custom' || node.status === 'ready' || node.status === 'blocked') {
    return false
  }
  return node.children.every(nodeComplete)
}

function aggregateStatus(
  self: MorphusSlotNode['status'],
  children: readonly MorphusSlotNode[],
): MorphusSlotNode['status'] {
  if (self === 'incomplete_custom') return self
  if (self !== 'complete') return self
  if (children.some((child) => child.status === 'incomplete_custom')) {
    return 'incomplete_custom'
  }
  if (children.some((child) => child.status !== 'complete')) {
    return children.some((child) => child.status === 'ready') ? 'ready' : 'blocked'
  }
  return 'complete'
}

function traitPickOptions(
  tableId: string,
  opts: ResolveOpts,
): MorphusSlotPickOption[] {
  if (tableId === 'characteristics') {
    const rerollAbove = opts.rerollCharacteristicsAbove
    return MORPHUS_CHARACTERISTICS_ROUTING_TABLE.entries
      .filter((entry) => {
        if (rerollAbove == null) return true
        return entry.percentile.max <= rerollAbove
      })
      .map((entry) =>
        enrichMorphusTraitPickOption(entry.id, {
          id: entry.id,
          name: entry.name,
          band: formatMorphusPercentileBand(entry.percentile.min, entry.percentile.max),
          tableRoute: formatMorphusSlotPlanRoute(entry.slotPlan),
        }),
      )
  }

  const table = getMorphusTableById(tableId)
  if (!table) return []

  return listMorphusTraitEntriesWithPercentiles(tableId).map((entry) =>
    enrichMorphusTraitPickOption(entry.id, {
      id: entry.id,
      name: entry.name,
      band:
        entry.percentile != null
          ? formatMorphusPercentileBand(entry.percentile.min, entry.percentile.max)
          : undefined,
      description: entry.description,
    }),
  )
}

function tableLabel(tableId: string, fallback?: string): string {
  if (tableId === 'characteristics') return 'Characteristics'
  return getMorphusTableById(tableId)?.displayName ?? fallback ?? tableId
}

function isCustomTraitPending(
  entry: MorphusCharacteristic,
  state: MorphusForgeSlotState,
  path: string,
): boolean {
  if (!entry.customTraitResolution) return false
  const instance = customInstance(state, path) ?? emptyMorphusCustomTraitInstance()
  return !isMorphusCustomTraitSlotComplete({
    slotId: path,
    catalogEntryId: entry.id,
    customInstance: instance,
  })
}

function variantPickPath(parentPath: string): string {
  return `${parentPath}/variant`
}

function expandPostPickChildren(
  path: string,
  entry: MorphusCharacteristic,
  state: MorphusForgeSlotState,
  opts: ResolveOpts,
): MorphusSlotNode[] {
  const nodes: MorphusSlotNode[] = []

  if (entry.variantPercentiles?.length) {
    const variantPath = variantPickPath(path)
    const chosen = variantPick(state, variantPath)
    const pickEntries = buildMorphusVariantPickEntries(entry.id, entry.variantPercentiles)
    if (!chosen) {
      nodes.push({
        path: variantPath,
        label: `${entry.name} — variant`,
        kind: 'variant_choice',
        status: 'ready',
        pickEntries,
        children: [],
      })
    } else {
      const variant = entry.variantPercentiles.find(
        (row) => row.label === chosen || row.roll === chosen,
      )
      nodes.push({
        path: variantPath,
        label: `${entry.name} — variant`,
        kind: 'variant_choice',
        status: 'complete',
        resolvedEntryId: variant
          ? morphusVariantMergedEntryId(entry.id, variant)
          : undefined,
        resolvedEntryName: variant?.label ?? chosen,
        pickEntries,
        children: [],
      })
    }
  }

  if (entry.independentSubRolls?.length) {
    for (let i = 0; i < entry.independentSubRolls.length; i += 1) {
      const sub = entry.independentSubRolls[i]!
      const subPath = `${path}/ind:${i}`
      const chosen = variantPick(state, subPath)
      if (!chosen) {
        nodes.push({
          path: subPath,
          label: sub.tableName,
          kind: 'variant_choice',
          status: 'ready',
          pickEntries: sub.options.map((option) => ({
            id: option.label,
            name: option.label,
            description: option.description,
            bonuses: [],
            penalties: [],
          })),
          children: [],
        })
      }
    }
  }

  if (entry.subTraitChoicesBudget) {
    const budget = entry.subTraitChoicesBudget
    const count = budget.slotsAvailable ?? 0
    for (let i = 0; i < count; i += 1) {
      const subPath = `${path}/sub:${i}`
      const chosenTable = subTraitPick(state, path, i)
      if (!chosenTable) {
        nodes.push({
          path: subPath,
          label: `Sub-trait pick ${i + 1} of ${count}`,
          kind: 'sub_trait_choice',
          status: 'ready',
          pickEntries: budget.allowedChoicesPool.map((tableId) => ({
            id: tableId,
            name: tableLabel(tableId),
            tableRoute: `Pick one trait from ${tableLabel(tableId)}`,
            bonuses: [],
            penalties: [],
          })),
          children: [],
        })
      } else {
        nodes.push(
          expandTableResolution(
            subPath,
            tableLabel(chosenTable),
            chosenTable,
            undefined,
            state,
            opts,
          ),
        )
      }
    }
  }

  if (entry.tableWorkflow?.stepOneRollCount) {
    const count = entry.tableWorkflow.stepOneRollCount
    const targetId = entry.crossTableRoll?.targetTableId
    if (targetId) {
      for (let i = 0; i < count; i += 1) {
        nodes.push(
          expandTableResolution(
            `${path}/wf:${i}`,
            `${tableLabel(targetId)} (${i + 1} of ${count})`,
            targetId,
            { tableId: targetId, label: tableLabel(targetId) },
            state,
            { ...opts, rerollCharacteristicsAbove: entry.tableWorkflow.excludeSelfFromReroll ? 90 : opts.rerollCharacteristicsAbove },
          ),
        )
      }
      return nodes
    }
  }

  if (entry.crossTableRoll) {
    nodes.push(
      expandTableResolution(
        `${path}/cross`,
        entry.crossTableRoll.targetTableName ?? tableLabel(entry.crossTableRoll.targetTableId),
        entry.crossTableRoll.targetTableId,
        undefined,
        state,
        opts,
      ),
    )
  }

  return nodes
}

function expandTableResolution(
  path: string,
  label: string,
  tableId: string,
  target: MorphusForgeTableTarget | undefined,
  state: MorphusForgeSlotState,
  opts: ResolveOpts,
): MorphusSlotNode {
  const isCharacteristics = tableId === 'characteristics'
  const chosenId = isCharacteristics ? routingPick(state, path) : pick(state, path)

  if (!chosenId) {
    return {
      path,
      label,
      kind: isCharacteristics ? 'characteristic' : 'table',
      status: 'ready',
      tableId,
      pickEntries: traitPickOptions(tableId, {
        rerollCharacteristicsAbove: target?.rerollMultiRollResults
          ? opts.rerollCharacteristicsAbove ?? 90
          : opts.rerollCharacteristicsAbove,
      }),
      children: [],
    }
  }

  if (isCharacteristics) {
    const routingEntry = MORPHUS_CHARACTERISTICS_ROUTING_TABLE.entries.find(
      (row) => row.id === chosenId,
    )
    const children = routingEntry
      ? buildPlanSlotNodes(routingEntry.slotPlan, `${path}/plan`, state, opts)
      : []
    return {
      path,
      label: routingEntry?.name ?? label,
      kind: 'characteristic',
      status: aggregateStatus('complete', children),
      tableId,
      resolvedEntryId: chosenId,
      resolvedEntryName: routingEntry?.name,
      children,
    }
  }

  const entry = getMorphusCharacteristicById(chosenId)
  if (!entry) {
    return {
      path,
      label,
      kind: 'table',
      status: 'ready',
      tableId,
      children: [],
      blockReason: 'Selected trait could not be loaded.',
    }
  }

  if (entry.customTraitResolution && isCustomTraitPending(entry, state, path)) {
    return {
      path,
      label: entry.name,
      kind: 'custom_trait',
      status: 'incomplete_custom',
      customCatalogEntryId: entry.id,
      resolvedEntryId: entry.id,
      resolvedEntryName: entry.name,
      children: [],
    }
  }

  const children = expandPostPickChildren(path, entry, state, opts)
  const hasFollowUp =
    !!entry.crossTableRoll ||
    !!entry.subTraitChoicesBudget ||
    !!entry.tableWorkflow?.stepOneRollCount ||
    (entry.independentSubRolls?.length ?? 0) > 0 ||
    (entry.variantPercentiles?.length ?? 0) > 0
  const pendingCustom = entry.customTraitResolution && isCustomTraitPending(entry, state, path)
  const selfStatus: MorphusSlotNode['status'] = pendingCustom
    ? 'incomplete_custom'
    : hasFollowUp && children.some((child) => child.status !== 'complete')
      ? 'ready'
      : 'complete'

  return {
    path,
    label: entry.name,
    kind: entry.customTraitResolution ? 'custom_trait' : 'table',
    status: aggregateStatus(selfStatus, children),
    tableId,
    resolvedEntryId: entry.id,
    resolvedEntryName: entry.name,
    customCatalogEntryId: entry.customTraitResolution ? entry.id : undefined,
    children,
  }
}

function buildPlanSlotNodes(
  slotPlan: readonly MorphusForgeSlotRequirement[],
  pathPrefix: string,
  state: MorphusForgeSlotState,
  opts: ResolveOpts,
): MorphusSlotNode[] {
  const nodes: MorphusSlotNode[] = []

  for (let index = 0; index < slotPlan.length; index += 1) {
    const slot = slotPlan[index]!
    const path = `${pathPrefix}:${index}`
    nodes.push(buildPlanSlotNode(slot, path, state, opts))
  }

  return nodes
}

function buildPlanSlotNode(
  slot: MorphusForgeSlotRequirement,
  path: string,
  state: MorphusForgeSlotState,
  opts: ResolveOpts,
): MorphusSlotNode {
  switch (slot.kind) {
    case 'required':
      return expandTableResolution(
        path,
        slot.label,
        slot.tableId,
        slot,
        state,
        {
          ...opts,
          rerollCharacteristicsAbove: slot.rerollMultiRollResults
            ? opts.rerollCharacteristicsAbove ?? 90
            : opts.rerollCharacteristicsAbove,
        },
      )
    case 'choice': {
      const chosen = branchTable(state, path)
      if (!chosen) {
        return {
          path,
          label: slot.label ?? 'Choose one',
          kind: 'choice',
          status: 'ready',
          options: slot.options.map((option) => ({
            tableId: option.tableId,
            label: option.label ?? tableLabel(option.tableId),
          })),
          children: [],
        }
      }
      const target = slot.options.find((option) => option.tableId === chosen)
      const child = expandTableResolution(
        `${path}/branch`,
        target?.label ?? tableLabel(chosen),
        chosen,
        target,
        state,
        {
          ...opts,
          rerollCharacteristicsAbove: target?.rerollMultiRollResults
            ? opts.rerollCharacteristicsAbove ?? 90
            : opts.rerollCharacteristicsAbove,
        },
      )
      return {
        path,
        label: slot.label ?? target?.label ?? tableLabel(chosen),
        kind: 'choice',
        status: child.status,
        options: slot.options.map((option) => ({
          tableId: option.tableId,
          label: option.label ?? tableLabel(option.tableId),
        })),
        resolvedEntryName: target?.label ?? tableLabel(chosen),
        children: [child],
      }
    }
    case 'repeat': {
      const children: MorphusSlotNode[] = []
      for (let i = 0; i < slot.count; i += 1) {
        children.push(
          expandTableResolution(
            `${path}/r:${i}`,
            `${slot.label} (${i + 1} of ${slot.count})`,
            slot.tableId,
            slot,
            state,
            {
              ...opts,
              rerollCharacteristicsAbove: slot.rerollMultiRollResults
                ? opts.rerollCharacteristicsAbove ?? 90
                : opts.rerollCharacteristicsAbove,
            },
          ),
        )
      }
      return {
        path,
        label: `${slot.count}× ${slot.label}`,
        kind: 'table',
        status: aggregateStatus(
          children.every((child) => child.status === 'complete') ? 'complete' : 'ready',
          children,
        ),
        tableId: slot.tableId,
        children,
      }
    }
    case 'combination_pool': {
      const countPath = `${path}/count`
      const count = diceValue(state, countPath)
      if (count == null) {
        return {
          path,
          label: slot.label ?? 'Combination count',
          kind: 'dice',
          status: 'ready',
          diceSpec: slot.countRoll,
          children: [],
        }
      }
      if (count < slot.countRoll.min || count > slot.countRoll.max) {
        return {
          path,
          label: slot.label ?? 'Combination count',
          kind: 'dice',
          status: 'ready',
          diceSpec: slot.countRoll,
          blockReason: `Enter ${slot.countRoll.notation} (${slot.countRoll.min}–${slot.countRoll.max}).`,
          children: [],
        }
      }
      const children: MorphusSlotNode[] = []
      for (let i = 0; i < count; i += 1) {
        const comboPath = `${path}/c:${i}`
        const chosen = branchTable(state, comboPath)
        if (!chosen) {
          children.push({
            path: comboPath,
            label: `Combination ${i + 1} of ${count}`,
            kind: 'choice',
            status: 'ready',
            options: slot.pool.map((option) => ({
              tableId: option.tableId,
              label: option.label ?? tableLabel(option.tableId),
            })),
            children: [],
          })
        } else {
          const target = slot.pool.find((option) => option.tableId === chosen)
          children.push(
            expandTableResolution(
              `${comboPath}/branch`,
              target?.label ?? tableLabel(chosen),
              chosen,
              target,
              state,
              {
                ...opts,
                rerollCharacteristicsAbove: target?.rerollMultiRollResults
                  ? opts.rerollCharacteristicsAbove ?? 90
                  : opts.rerollCharacteristicsAbove,
              },
            ),
          )
        }
      }
      return {
        path,
        label: slot.label ?? `${slot.countRoll.notation} combinations`,
        kind: 'dice',
        status: aggregateStatus('complete', children),
        diceSpec: slot.countRoll,
        children,
      }
    }
    case 'characteristics_multiplier': {
      const children: MorphusSlotNode[] = []
      for (let i = 0; i < slot.count; i += 1) {
        children.push(
          expandTableResolution(
            `${path}/m:${i}`,
            `${slot.label ?? 'Characteristic'} (${i + 1} of ${slot.count})`,
            'characteristics',
            {
              tableId: 'characteristics',
              label: 'Characteristics',
              rerollMultiRollResults: true,
            },
            state,
            { rerollCharacteristicsAbove: slot.rerollAbovePercentile },
          ),
        )
      }
      return {
        path,
        label: slot.label ?? `${slot.count}× Characteristics`,
        kind: 'characteristic',
        status: aggregateStatus(
          children.every((child) => child.status === 'complete') ? 'complete' : 'ready',
          children,
        ),
        children,
      }
    }
    default:
      return {
        path,
        label: 'Unknown slot',
        kind: 'table',
        status: 'blocked',
        blockReason: 'Unsupported slot kind.',
        children: [],
      }
  }
}

export function rootMorphusSlotPlan(
  forgeState: MorphusForgeState,
): readonly MorphusForgeSlotRequirement[] {
  if (forgeState.path === 'appearance') {
    const entry = MORPHUS_APPEARANCE_ROUTING_TABLE.entries.find(
      (row) => row.id === forgeState.appearanceEntryId,
    )
    return entry?.slotPlan ?? []
  }
  if (forgeState.path === 'characteristics') {
    const count = forgeState.characteristicsPickCount
    if (count == null) return []
    return Array.from({ length: count }, (_, index) => ({
      kind: 'required' as const,
      tableId: 'characteristics',
      label: `Characteristic ${index + 1}`,
      rerollMultiRollResults: true,
    }))
  }
  return []
}

export function buildMorphusSlotTree(
  forgeState: MorphusForgeState,
  slotState: MorphusForgeSlotState | undefined,
): MorphusSlotNode[] {
  const plan = rootMorphusSlotPlan(forgeState)
  if (plan.length === 0) return []
  return buildPlanSlotNodes(plan, 'plan', normalizeSlotState(slotState), {
    rerollCharacteristicsAbove: 90,
  })
}

export function flattenMorphusSlotNodes(
  nodes: readonly MorphusSlotNode[],
): MorphusSlotNode[] {
  const out: MorphusSlotNode[] = []
  const walk = (list: readonly MorphusSlotNode[]) => {
    for (const node of list) {
      out.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return out
}

export function isMorphusSlotTreeComplete(nodes: readonly MorphusSlotNode[]): boolean {
  const flat = flattenMorphusSlotNodes(nodes)
  if (flat.length === 0) return false
  return flat.every(nodeComplete)
}

export function morphusSlotTreeBlockers(nodes: readonly MorphusSlotNode[]): string[] {
  const blockers: string[] = []
  for (const node of flattenMorphusSlotNodes(nodes)) {
    if (node.status === 'incomplete_custom') {
      blockers.push(`Complete the custom trait for ${node.label}.`)
    } else if (node.status === 'ready') {
      blockers.push(`Resolve ${node.label}.`)
    } else if (node.status === 'blocked' && node.blockReason) {
      blockers.push(node.blockReason)
    }
  }
  return blockers
}

export function syncMorphusTraitSlotsFromForgeState(
  forgeSlotState: MorphusForgeSlotState | undefined,
  nodes: readonly MorphusSlotNode[],
): MorphusTraitSlotResolution[] {
  const state = normalizeSlotState(forgeSlotState)
  const resolutions: MorphusTraitSlotResolution[] = []

  for (const node of flattenMorphusSlotNodes(nodes)) {
    if (node.kind === 'custom_trait' && node.customCatalogEntryId) {
      const instance = customInstance(state, node.path)
      if (instance) {
        resolutions.push({
          slotId: node.path,
          catalogEntryId: node.customCatalogEntryId,
          customInstance: sanitizeMorphusCustomTraitInstance(instance),
        })
      }
      continue
    }
    if (!node.resolvedEntryId || node.kind === 'choice' || node.kind === 'dice') continue
    const entry = getMorphusCharacteristicById(node.resolvedEntryId)
    if (!entry) continue
    if (entry.entryRole === 'table_router') continue
    if (entry.crossTableRoll && node.children.length > 0) continue
    if (
      entry.variantPercentiles?.length &&
      !node.resolvedEntryId.includes('::variant:')
    ) {
      continue
    }
    if (entry.subTraitChoicesBudget && node.children.some((child) => child.status !== 'complete')) {
      continue
    }
    if (entry.customTraitResolution) continue
    resolutions.push({
      slotId: node.path,
      catalogEntryId: node.resolvedEntryId,
    })
  }

  const seen = new Set<string>()
  return resolutions.filter((row) => {
    const key = `${row.catalogEntryId}:${row.slotId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function deriveMorphusSlotResolutionView(
  forgeState: MorphusForgeState,
  slotState: MorphusForgeSlotState | undefined,
): {
  nodes: MorphusSlotNode[]
  complete: boolean
  blockers: string[]
  traitSlots: MorphusTraitSlotResolution[]
} {
  const nodes = buildMorphusSlotTree(forgeState, slotState)
  return {
    nodes,
    complete: isMorphusSlotTreeComplete(nodes),
    blockers: morphusSlotTreeBlockers(nodes),
    traitSlots: syncMorphusTraitSlotsFromForgeState(slotState, nodes),
  }
}

export function clearMorphusForgeSlotState(): MorphusForgeSlotState {
  return {}
}

function withoutPathPrefix(
  record: Readonly<Record<string, string>> | undefined,
  prefix: string,
): Record<string, string> | undefined {
  if (!record) return undefined
  const next = Object.fromEntries(
    Object.entries(record).filter(([key]) => !key.startsWith(prefix)),
  )
  return Object.keys(next).length > 0 ? next : undefined
}

function withoutPathPrefixNumbers(
  record: Readonly<Record<string, number>> | undefined,
  prefix: string,
): Record<string, number> | undefined {
  if (!record) return undefined
  const next = Object.fromEntries(
    Object.entries(record).filter(([key]) => !key.startsWith(prefix)),
  )
  return Object.keys(next).length > 0 ? next : undefined
}

function withoutPathPrefixCustom(
  record: Readonly<Record<string, MorphusCustomTraitInstance>> | undefined,
  prefix: string,
): Record<string, MorphusCustomTraitInstance> | undefined {
  if (!record) return undefined
  const next = Object.fromEntries(
    Object.entries(record).filter(([key]) => !key.startsWith(prefix)),
  )
  return Object.keys(next).length > 0 ? next : undefined
}

/** Clear a slot path and all descendant resolution keys. */
export function clearMorphusSlotPathState(
  state: MorphusForgeSlotState | undefined,
  path: string,
): MorphusForgeSlotState {
  const current = normalizeSlotState(state)
  return {
    picks: withoutPathPrefix(current.picks, path),
    routingPicks: withoutPathPrefix(current.routingPicks, path),
    branchTableIds: withoutPathPrefix(current.branchTableIds, path),
    diceValues: withoutPathPrefixNumbers(current.diceValues, path),
    subTraitPicks: withoutPathPrefix(current.subTraitPicks, path),
    variantPicks: withoutPathPrefix(current.variantPicks, path),
    customInstances: withoutPathPrefixCustom(current.customInstances, path),
  }
}

export function patchMorphusForgeSlotState(
  prev: MorphusForgeSlotState | undefined,
  patch: MorphusForgeSlotState,
): MorphusForgeSlotState {
  return {
    ...normalizeSlotState(prev),
    ...patch,
    picks: { ...normalizeSlotState(prev).picks, ...patch.picks },
    routingPicks: { ...normalizeSlotState(prev).routingPicks, ...patch.routingPicks },
    branchTableIds: {
      ...normalizeSlotState(prev).branchTableIds,
      ...patch.branchTableIds,
    },
    diceValues: { ...normalizeSlotState(prev).diceValues, ...patch.diceValues },
    subTraitPicks: { ...normalizeSlotState(prev).subTraitPicks, ...patch.subTraitPicks },
    variantPicks: { ...normalizeSlotState(prev).variantPicks, ...patch.variantPicks },
    customInstances: {
      ...normalizeSlotState(prev).customInstances,
      ...patch.customInstances,
    },
  }
}

export function path2CharacteristicsCountValid(forgeState: MorphusForgeState): boolean {
  if (forgeState.path !== 'characteristics') return true
  const count = forgeState.characteristicsPickCount
  const { min, max } = MORPHUS_FORGE_MANIFEST.path2.countRoll
  return count != null && count >= min && count <= max
}

export function morphusTraitForgeReady(
  forgeState: MorphusForgeState,
  character: Pick<Character, 'morphusForgeSlotState'>,
): boolean {
  if (!forgeState.path) return false
  if (forgeState.path === 'appearance' && !forgeState.appearanceEntryId?.trim()) return false
  if (!path2CharacteristicsCountValid(forgeState)) return false
  const view = deriveMorphusSlotResolutionView(forgeState, character.morphusForgeSlotState)
  return view.complete
}
