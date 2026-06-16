import type {
  MorphusCustomTraitInstance,
  MorphusForgeSlotState,
  MorphusHouseRules,
  MorphusSlotNode,
} from '../../../types'
import { useMemo, useState } from 'react'
import { MORPHUS_CHARACTERISTICS_ROUTING_TABLE } from '../../../data/library/morphusForgeRoutingLoader'
import { getMorphusCharacteristicById } from '../../../data/library/morphusTableCatalogLoader'
import {
  buildMorphusChoiceBranchNode,
  isMorphusSubTraitTablePickBlocked,
  isMorphusTraitPickAlreadySelected,
  readMorphusChoiceBranchTableId,
} from '../../../lib/morphusSlotResolution'
import {
  enrichMorphusTraitPickOption,
  formatMorphusSlotPlanRoute,
  morphusTraitTableRouteHint,
} from '../../../lib/morphusTraitPickDisplay'
import { formatMorphusPercentileBand } from '../../../lib/morphusForgeNavigation'
import type { MorphusSlotPickOption } from '../../../types'
import { CustomTraitWorkshop } from './CustomTraitWorkshop'
import {
  MORPHUS_FORGE_BRANCH_CLASS,
  MORPHUS_FORGE_FIELD_CLASS,
  MorphusSelectedTraitCard,
  MorphusTraitPickCard,
} from './MorphusTraitPickCard'

export type SlotActions = {
  onTraitPick: (path: string, entryId: string, isCharacteristics: boolean) => void
  onBranchPick: (path: string, tableId: string) => void
  onDiceValue: (path: string, value: number | undefined) => void
  onSubTraitPick: (path: string, index: number, tableId: string) => void
  onVariantPick: (path: string, label: string) => void
  onCustomTrait: (path: string, instance: MorphusCustomTraitInstance) => void
  onClearPick: (path: string) => void
}

function statusBorder(status: MorphusSlotNode['status']): string {
  switch (status) {
    case 'complete':
      return 'border-emerald-500/60 bg-emerald-950/25'
    case 'incomplete_custom':
      return 'border-amber-500/60 bg-amber-950/25'
    case 'ready':
      return 'border-violet-500/60 bg-violet-950/35'
    default:
      return 'border-violet-800/50 bg-slate-950/50 opacity-80'
  }
}

function resolvedTableRoute(node: MorphusSlotNode): string | undefined {
  if (!node.resolvedEntryId) return undefined
  if (node.tableId === 'characteristics') {
    const entry = MORPHUS_CHARACTERISTICS_ROUTING_TABLE.entries.find(
      (row) => row.id === node.resolvedEntryId,
    )
    return entry ? formatMorphusSlotPlanRoute(entry.slotPlan) : undefined
  }
  const entry = getMorphusCharacteristicById(node.resolvedEntryId)
  return entry ? morphusTraitTableRouteHint(entry) : undefined
}

function resolvedPickEntry(node: MorphusSlotNode): MorphusSlotPickOption | null {
  if (!node.resolvedEntryName) return null

  const fromPickList = node.pickEntries?.find((e) => e.id === node.resolvedEntryId)
  if (fromPickList) return fromPickList

  const tableRoute =
    node.pickEntries?.find((e) => e.id === node.resolvedEntryId)?.tableRoute ??
    resolvedTableRoute(node)

  if (node.resolvedEntryId) {
    const catalogEntry = getMorphusCharacteristicById(node.resolvedEntryId)
    if (catalogEntry) {
      return enrichMorphusTraitPickOption(node.resolvedEntryId, {
        id: node.resolvedEntryId,
        name: node.resolvedEntryName,
        description: catalogEntry.description,
        tableRoute,
        band:
          catalogEntry.percentile != null
            ? formatMorphusPercentileBand(
                catalogEntry.percentile.min,
                catalogEntry.percentile.max,
              )
            : undefined,
      })
    }

    const routingEntry = MORPHUS_CHARACTERISTICS_ROUTING_TABLE.entries.find(
      (row) => row.id === node.resolvedEntryId,
    )
    if (routingEntry) {
      return enrichMorphusTraitPickOption(node.resolvedEntryId, {
        id: node.resolvedEntryId,
        name: node.resolvedEntryName,
        tableRoute: formatMorphusSlotPlanRoute(routingEntry.slotPlan),
        band: formatMorphusPercentileBand(
          routingEntry.percentile.min,
          routingEntry.percentile.max,
        ),
      })
    }
  }

  return {
    id: node.resolvedEntryId ?? node.path,
    name: node.resolvedEntryName,
    tableRoute,
    bonuses: [],
    penalties: [],
  }
}

function nodeShowsTraitModifiers(node: MorphusSlotNode): boolean {
  return node.kind === 'table' || node.kind === 'variant_choice'
}

export function isMorphusMultiOptionChoice(node: MorphusSlotNode): boolean {
  return node.kind === 'choice' && (node.options?.length ?? 0) > 1
}

function choiceTabClass(selected: boolean): string {
  if (selected) {
    return 'border-violet-400 bg-violet-600 text-white ring-1 ring-violet-400/70'
  }
  return 'border-slate-800 bg-black text-slate-200 ring-1 ring-slate-900 hover:border-violet-700 hover:bg-slate-950'
}

function MorphusChoiceSubTableTabs({
  node,
  actions,
  slotState,
  selectedCatalogIds,
  morphusHouseRules,
}: {
  node: MorphusSlotNode
  actions: SlotActions
  slotState?: MorphusForgeSlotState
  selectedCatalogIds?: ReadonlySet<string>
  morphusHouseRules?: MorphusHouseRules
}) {
  const options = node.options ?? []
  const chosenTableId = readMorphusChoiceBranchTableId(slotState, node.path)
  const [previewTableId, setPreviewTableId] = useState<string | undefined>(undefined)
  const activeTableId = chosenTableId ?? previewTableId

  const panelNode = useMemo(() => {
    if (!activeTableId) return null
    const option = options.find((row) => row.tableId === activeTableId)
    if (!option) return null
    if (chosenTableId === activeTableId && node.children[0]) {
      return node.children[0]
    }
    return buildMorphusChoiceBranchNode(node.path, option, slotState)
  }, [activeTableId, chosenTableId, node.children, node.path, options, slotState])

  if (options.length === 0) return null

  const selectTab = (tableId: string) => {
    setPreviewTableId(tableId)
    actions.onBranchPick(node.path, tableId)
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={node.label}>
        {options.map((option) => {
          const selected = option.tableId === chosenTableId
          return (
            <button
              key={option.tableId}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectTab(option.tableId)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${choiceTabClass(selected)}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {panelNode ? (
        <div role="tabpanel" aria-label={options.find((o) => o.tableId === activeTableId)?.label}>
          <MorphusSlotNodeView
            node={panelNode}
            actions={actions}
            slotState={slotState}
            selectedCatalogIds={selectedCatalogIds}
            morphusHouseRules={morphusHouseRules}
          />
        </div>
      ) : (
        <p className="text-xs text-violet-400">Select a table above to continue.</p>
      )}
    </div>
  )
}

function PickList({
  node,
  onPick,
  showModifiers = false,
  selectedCatalogIds,
  slotState,
  morphusHouseRules,
  subTraitPickKey,
}: {
  node: MorphusSlotNode
  onPick: (entryId: string) => void
  showModifiers?: boolean
  selectedCatalogIds?: ReadonlySet<string>
  slotState?: MorphusForgeSlotState
  morphusHouseRules?: MorphusHouseRules
  subTraitPickKey?: string
}) {
  if (!node.pickEntries?.length) {
    return <p className="text-xs text-violet-400">No selectable entries for this table.</p>
  }
  return (
    <ul className="mt-2 max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto pr-1">
      {node.pickEntries.map((entry) => {
        const traitAlreadySelected =
          node.kind === 'sub_trait_choice' &&
          node.subTraitPoolMode === 'trait_entry' &&
          selectedCatalogIds != null &&
          isMorphusTraitPickAlreadySelected(node, entry.id, selectedCatalogIds, slotState)
        const subTableBlocked =
          node.kind === 'sub_trait_choice' &&
          (node.subTraitPoolMode === 'morphus_table' ||
            node.subTraitPoolMode === 'gimmick' ||
            node.subTraitPoolMode == null) &&
          isMorphusSubTraitTablePickBlocked(
            entry.id,
            slotState,
            morphusHouseRules,
            subTraitPickKey,
          )
        const blocked = traitAlreadySelected || subTableBlocked
        const pickEntry: MorphusSlotPickOption = blocked
          ? {
              ...entry,
              disabled: true,
              disabledReason:
                subTableBlocked && node.subTraitPoolMode === 'morphus_table'
                  ? 'Already have a trait from this table'
                  : 'Already selected',
            }
          : entry
        return (
          <li key={entry.id}>
            <MorphusTraitPickCard
              entry={pickEntry}
              showModifiers={showModifiers}
              onPick={() => onPick(entry.id)}
            />
          </li>
        )
      })}
    </ul>
  )
}

function MorphusSlotNodeBody({
  node,
  actions,
  slotState,
  selectedCatalogIds,
  morphusHouseRules,
}: {
  node: MorphusSlotNode
  actions: SlotActions
  slotState?: MorphusForgeSlotState
  selectedCatalogIds?: ReadonlySet<string>
  morphusHouseRules?: MorphusHouseRules
}) {
  const hasResolvedPick = Boolean(node.resolvedEntryName)
  const selectedEntry = hasResolvedPick ? resolvedPickEntry(node) : null
  const showModifiers = nodeShowsTraitModifiers(node)

  if (isMorphusMultiOptionChoice(node)) {
    return null
  }

  if (selectedEntry && node.kind !== 'custom_trait') {
    return (
      <MorphusSelectedTraitCard
        entry={selectedEntry}
        showModifiers={showModifiers}
        onChange={() => actions.onClearPick(node.path)}
      />
    )
  }

  if (node.kind === 'choice' && node.status === 'ready' && !node.resolvedEntryName) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {node.options?.map((option) => (
          <button
            key={option.tableId}
            type="button"
            onClick={() => actions.onBranchPick(node.path, option.tableId)}
            className={MORPHUS_FORGE_BRANCH_CLASS}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  if (node.kind === 'dice' && node.diceSpec && node.children.length === 0) {
    const spec = node.diceSpec
    const dicePath = `${node.path}/count`
    const current = slotState?.diceValues?.[dicePath]
    return (
      <label className="mt-2 block max-w-xs">
        <span className="text-xs font-medium text-violet-200">
          Enter your physical {spec.notation} result ({spec.min}–{spec.max})
        </span>
        <input
          type="number"
          min={spec.min}
          max={spec.max}
          value={current ?? ''}
          className={`mt-1 ${MORPHUS_FORGE_FIELD_CLASS}`}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              actions.onDiceValue(dicePath, undefined)
              return
            }
            const n = Number.parseInt(raw, 10)
            actions.onDiceValue(dicePath, Number.isFinite(n) ? n : undefined)
          }}
        />
        {node.blockReason ? (
          <span className="mt-1 block text-xs text-amber-300">{node.blockReason}</span>
        ) : null}
      </label>
    )
  }

  if (node.kind === 'sub_trait_choice' && node.status === 'ready') {
    const match = /^(.*)\/sub:(\d+)$/.exec(node.path)
    if (match) {
      return (
        <PickList
          node={node}
          onPick={(tableId) => actions.onSubTraitPick(match[1]!, Number(match[2]), tableId)}
          selectedCatalogIds={selectedCatalogIds}
          slotState={slotState}
          morphusHouseRules={morphusHouseRules}
          subTraitPickKey={`${match[1]}#${match[2]}`}
        />
      )
    }
  }

  if (node.kind === 'variant_choice' && node.status === 'ready') {
    return (
      <PickList
        node={node}
        showModifiers
        selectedCatalogIds={selectedCatalogIds}
        slotState={slotState}
        morphusHouseRules={morphusHouseRules}
        onPick={(label) => actions.onVariantPick(node.path, label)}
      />
    )
  }

  if (
    (node.kind === 'table' || node.kind === 'characteristic') &&
    node.status === 'ready' &&
    !node.resolvedEntryId
  ) {
    return (
      <PickList
        node={node}
        showModifiers={showModifiers}
        selectedCatalogIds={selectedCatalogIds}
        slotState={slotState}
        morphusHouseRules={morphusHouseRules}
        onPick={(entryId) =>
          actions.onTraitPick(node.path, entryId, node.kind === 'characteristic')
        }
      />
    )
  }

  if (node.kind === 'custom_trait' && node.customCatalogEntryId) {
    return (
      <div className="mt-2">
        <CustomTraitWorkshop
          slot={{
            slotId: node.path,
            catalogEntryId: node.customCatalogEntryId,
            customInstance: slotState?.customInstances?.[node.path],
          }}
          onChange={(_, instance) => actions.onCustomTrait(node.path, instance)}
        />
      </div>
    )
  }

  if (node.blockReason) {
    return <p className="mt-2 text-xs text-amber-300">{node.blockReason}</p>
  }

  return null
}

export function MorphusSlotNodeView({
  node,
  actions,
  slotState,
  selectedCatalogIds,
  morphusHouseRules,
  depth = 0,
  embedded = false,
}: {
  node: MorphusSlotNode
  actions: SlotActions
  slotState?: MorphusForgeSlotState
  selectedCatalogIds?: ReadonlySet<string>
  morphusHouseRules?: MorphusHouseRules
  depth?: number
  embedded?: boolean
}) {
  if (isMorphusMultiOptionChoice(node) && !embedded) {
    return (
      <article className={`rounded-xl border-2 p-3 ${statusBorder(node.status)}`}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-violet-50">{node.label}</h4>
          <span className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
            {node.status === 'complete'
              ? 'Complete'
              : node.status === 'ready'
                ? 'Pick required'
                : 'Blocked'}
          </span>
        </header>
        <MorphusChoiceSubTableTabs
          node={node}
          actions={actions}
          slotState={slotState}
          selectedCatalogIds={selectedCatalogIds}
          morphusHouseRules={morphusHouseRules}
        />
      </article>
    )
  }

  const content = (
    <>
      {!embedded ? (
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-violet-50">{node.label}</h4>
          <span className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
            {node.status === 'complete'
              ? 'Complete'
              : node.status === 'incomplete_custom'
                ? 'Custom trait'
                : node.status === 'ready'
                  ? 'Pick required'
                  : 'Blocked'}
          </span>
        </header>
      ) : null}
      <MorphusSlotNodeBody
        node={node}
        actions={actions}
        slotState={slotState}
        selectedCatalogIds={selectedCatalogIds}
        morphusHouseRules={morphusHouseRules}
      />
      {node.children.length > 0 ? (
        <div
          className={
            embedded
              ? 'mt-3 space-y-3'
              : 'mt-3 space-y-3 border-t border-violet-800/50 pt-3'
          }
        >
          {node.children.map((child) => {
            if (isMorphusMultiOptionChoice(child)) {
              return (
                <MorphusChoiceSubTableTabs
                  key={child.path}
                  node={child}
                  actions={actions}
                  slotState={slotState}
                  selectedCatalogIds={selectedCatalogIds}
                  morphusHouseRules={morphusHouseRules}
                />
              )
            }
            return (
              <MorphusSlotNodeView
                key={child.path}
                node={child}
                actions={actions}
                slotState={slotState}
                selectedCatalogIds={selectedCatalogIds}
                morphusHouseRules={morphusHouseRules}
                depth={depth + 1}
              />
            )
          })}
        </div>
      ) : null}
    </>
  )

  if (embedded) {
    return <div className="space-y-2">{content}</div>
  }

  return (
    <article className={`rounded-xl border-2 p-3 ${statusBorder(node.status)}`}>
      {content}
    </article>
  )
}
