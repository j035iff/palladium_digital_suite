/** Visual states from universal_forge_navigation_engine.md */
export type ForgeTabVisualState =
  | 'complete'
  | 'active'
  | 'incomplete'
  | 'conflict'
  | 'locked'
  | 'na'

export type ForgeTabValidation = {
  ok: boolean
  blockers: string[]
}

export type ForgeTabView = {
  id: string
  label: string
  visual: ForgeTabVisualState
  clickable: boolean
  blockers: string[]
  conflictReason?: string
}

export type ForgeNavigationDerived = {
  tabs: ForgeTabView[]
  activeTabId: string
  /** Lowest-index tab that is red or yellow and must be repaired first. */
  firstRepairTabId: string | null
  showContinue: boolean
  continueEnabled: boolean
  continueTooltip: string
  terminalAccessible: boolean
}
