import type {
  ForgeNavigationDerived,
  ForgeTabValidation,
  ForgeTabView,
  ForgeTabVisualState,
} from './types'

export type ForgeTabDefinition<TId extends string> = {
  id: TId
  label: string
  isNa: () => boolean
  /** Human-readable explanation when {@link isNa} is true. */
  naReason?: () => string
  validate: () => ForgeTabValidation
  snapshot: () => string
}

export type ForgeCompletionState<TId extends string> = {
  completed: Readonly<Partial<Record<TId, true>>>
  snapshots: Readonly<Partial<Record<TId, string>>>
}

function isEffectiveComplete<TId extends string>(
  tab: ForgeTabDefinition<TId>,
  completed: Readonly<Partial<Record<TId, true>>>,
): boolean {
  return tab.isNa() || completed[tab.id] === true
}

function repairState<TId extends string>(
  tab: ForgeTabDefinition<TId>,
  completed: Readonly<Partial<Record<TId, true>>>,
  snapshots: Readonly<Partial<Record<TId, string>>>,
  validation: ForgeTabValidation,
): 'ok' | 'incomplete' | 'conflict' | 'pending' {
  if (!completed[tab.id]) return 'pending'
  if (!validation.ok) return 'incomplete'
  const snap = snapshots[tab.id]
  if (snap != null && snap !== tab.snapshot()) return 'conflict'
  return 'ok'
}

/** Status color before applying progress frontier (blue). */
function resolveTabStatusVisual(
  repair: 'ok' | 'incomplete' | 'conflict' | 'pending',
  markedComplete: boolean,
): ForgeTabVisualState {
  if (repair === 'conflict') return 'conflict'
  if (repair === 'incomplete') return 'incomplete'
  if (markedComplete && repair === 'ok') return 'complete'
  return 'available'
}

function applyProgressFrontierVisual<TId extends string>(
  tabDefs: readonly ForgeTabDefinition<TId>[],
  tabs: ForgeTabView[],
  unlockThrough: number,
  firstRepairIndex: number | null,
): string | null {
  const startIndex =
    firstRepairIndex != null ? firstRepairIndex : unlockThrough + 1

  for (let i = startIndex; i < tabDefs.length; i++) {
    const view = tabs[i]
    if (!view || view.visual === 'na' || !view.clickable) continue
    if (view.visual === 'available') {
      tabs[i] = { ...view, visual: 'active' }
    }
    return view.id
  }

  for (let i = tabDefs.length - 1; i >= 0; i--) {
    const view = tabs[i]
    if (!view?.clickable || view.visual === 'na' || view.visual === 'locked') {
      continue
    }
    if (view.visual === 'available') {
      tabs[i] = { ...view, visual: 'active' }
    }
    return view.id
  }

  return null
}

/**
 * Derive per-tab visual state and Continue affordances for a linear Forge.
 */
export function deriveForgeNavigation<TId extends string>(
  tabDefs: readonly ForgeTabDefinition<TId>[],
  activeTabId: TId,
  completion: ForgeCompletionState<TId>,
  opts?: {
    continueHint?: (tabId: TId, validation: ForgeTabValidation) => boolean
    terminalTabId?: TId
  },
): ForgeNavigationDerived & { activeTabId: TId } {
  const { completed, snapshots } = completion

  let unlockThrough = -1
  for (let i = 0; i < tabDefs.length; i++) {
    if (!isEffectiveComplete(tabDefs[i]!, completed)) break
    unlockThrough = i
  }

  let firstRepairIndex: number | null = null
  const repairByIndex: Array<'ok' | 'incomplete' | 'conflict' | 'pending'> = []

  for (let i = 0; i < tabDefs.length; i++) {
    const tab = tabDefs[i]!
    const validation = tab.validate()
    const repair = tab.isNa()
      ? 'ok'
      : repairState(tab, completed, snapshots, validation)
    repairByIndex.push(repair)
    if (
      firstRepairIndex == null &&
      (repair === 'incomplete' || repair === 'conflict')
    ) {
      firstRepairIndex = i
    }
  }

  const firstRepairTabId =
    firstRepairIndex != null ? tabDefs[firstRepairIndex]!.id : null

  const tabs: ForgeTabView[] = tabDefs.map((tab, i) => {
    const validation = tab.validate()
    const repair = repairByIndex[i]!

    if (tab.isNa()) {
      return {
        id: tab.id,
        label: tab.label,
        visual: 'na' as ForgeTabVisualState,
        clickable: true,
        blockers: validation.blockers,
        naReason:
          tab.naReason?.() ?? 'This step does not apply to the character you are building.',
      }
    }

    if (firstRepairIndex != null) {
      if (i < firstRepairIndex) {
        const visual = resolveTabStatusVisual(repair, completed[tab.id] === true)
        return {
          id: tab.id,
          label: tab.label,
          visual,
          clickable: true,
          blockers: validation.blockers,
          conflictReason:
            repair === 'conflict'
              ? 'Upstream changes invalidated choices on this step.'
              : repair === 'incomplete'
                ? validation.blockers[0]
                : undefined,
        }
      }
      if (i === firstRepairIndex) {
        const visual = resolveTabStatusVisual(repair, completed[tab.id] === true)
        return {
          id: tab.id,
          label: tab.label,
          visual,
          clickable: true,
          blockers: validation.blockers,
          conflictReason:
            repair === 'conflict'
              ? 'Upstream changes invalidated choices on this step — update selections and click Continue.'
              : validation.blockers[0],
        }
      }
      return {
        id: tab.id,
        label: tab.label,
        visual: 'locked',
        clickable: false,
        blockers: validation.blockers,
      }
    }

    if (i > unlockThrough + 1) {
      return {
        id: tab.id,
        label: tab.label,
        visual: 'locked',
        clickable: false,
        blockers: validation.blockers,
      }
    }

    const visual = resolveTabStatusVisual(repair, completed[tab.id] === true)

    return {
      id: tab.id,
      label: tab.label,
      visual,
      clickable: true,
      blockers: validation.blockers,
    }
  })

  let progressFrontierTabId = applyProgressFrontierVisual(
    tabDefs,
    tabs,
    unlockThrough,
    firstRepairIndex,
  )

  const activeTab = tabDefs.find((t) => t.id === activeTabId) ?? tabDefs[0]!
  const activeValidation = activeTab.validate()
  const isTerminal = opts?.terminalTabId === activeTabId
  const activeNa = activeTab.isNa()

  const REASSURANCE =
    'Validates this section and opens the next step. Your choices stay editable — you can return to this tab at any time to make changes.'

  let continueEnabled = false
  let continueTooltip = REASSURANCE

  if (!isTerminal && !activeNa) {
    const activeView = tabs.find((t) => t.id === activeTabId)!
    if (!activeView.clickable) {
      continueEnabled = false
      continueTooltip =
        firstRepairTabId != null
          ? `Resolve "${tabs.find((t) => t.id === firstRepairTabId)?.label}" first (top-down order).`
          : 'Complete prior tabs first.'
    } else if (firstRepairTabId != null && activeTabId !== firstRepairTabId) {
      continueEnabled = false
      continueTooltip = `Resolve "${tabs.find((t) => t.id === firstRepairTabId)?.label}" first (top-down order).`
    } else if (!activeValidation.ok) {
      continueEnabled = false
      continueTooltip = activeValidation.blockers.join(' ') || REASSURANCE
    } else if (activeView.visual === 'complete') {
      continueEnabled = false
      continueTooltip =
        'This section is already validated. You can still edit — re-validate with Continue if requirements change.'
    } else {
      continueEnabled = true
      if (opts?.continueHint?.(activeTabId, activeValidation)) {
        continueTooltip = `${REASSURANCE} Optional picks remain in this section.`
      }
    }
  }

  const terminalId = opts?.terminalTabId
  const terminalAccessible =
    terminalId != null &&
    firstRepairTabId == null &&
    tabDefs
      .filter((t) => t.id !== terminalId)
      .every((t) => isEffectiveComplete(t, completed))

  if (terminalId) {
    const terminalIdx = tabs.findIndex((t) => t.id === terminalId)
    if (terminalIdx >= 0) {
      if (terminalAccessible) {
        for (let j = 0; j < tabs.length; j++) {
          if (j !== terminalIdx && tabs[j]!.visual === 'active') {
            tabs[j] = { ...tabs[j]!, visual: 'available' }
          }
        }
        tabs[terminalIdx] = {
          ...tabs[terminalIdx]!,
          clickable: true,
          visual: 'active',
        }
        progressFrontierTabId = terminalId
      } else {
        tabs[terminalIdx] = {
          ...tabs[terminalIdx]!,
          clickable: false,
          visual: 'locked',
        }
      }
    }
  }

  for (let i = 0; i < tabs.length; i++) {
    tabs[i] = { ...tabs[i]!, isViewing: tabs[i]!.id === activeTabId }
  }

  return {
    tabs,
    activeTabId,
    progressFrontierTabId,
    firstRepairTabId,
    showContinue: !isTerminal && !activeNa,
    continueEnabled,
    continueTooltip,
    terminalAccessible,
  }
}

export function markForgeTabComplete<TId extends string>(
  tabId: TId,
  snapshot: string,
  prev: ForgeCompletionState<TId>,
): ForgeCompletionState<TId> {
  return {
    completed: { ...prev.completed, [tabId]: true },
    snapshots: { ...prev.snapshots, [tabId]: snapshot },
  }
}

/** Remove completion from tabs after `fromTabId` (data retained; user must re-validate). */
export function invalidateForgeCompletionFrom<TId extends string>(
  fromTabId: TId,
  tabOrder: readonly TId[],
  prev: ForgeCompletionState<TId>,
): ForgeCompletionState<TId> {
  const fromIndex = tabOrder.indexOf(fromTabId)
  if (fromIndex < 0) return prev

  const completed = { ...prev.completed }
  const snapshots = { ...prev.snapshots }
  for (let i = fromIndex + 1; i < tabOrder.length; i++) {
    const id = tabOrder[i]!
    if (String(id).includes('review')) continue
    delete completed[id]
    delete snapshots[id]
  }
  return { completed, snapshots }
}
