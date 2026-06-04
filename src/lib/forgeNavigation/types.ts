/** Visual states from universal_forge_navigation_engine.md */
export type ForgeTabVisualState =
  | 'complete'
  /** Progress frontier — furthest tab the player can advance on (not “currently viewing”). */
  | 'active'
  /** Unlocked earlier step — editable when visited, not the frontier. */
  | 'available'
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
  /** Tab whose content is in the viewport (dark outline in nav). */
  isViewing?: boolean
}

export type ForgeNavigationDerived = {
  tabs: ForgeTabView[]
  activeTabId: string
  /** Furthest unlocked step (blue pill) — not necessarily the viewed tab. */
  progressFrontierTabId: string | null
  /** Lowest-index tab that is red or yellow and must be repaired first. */
  firstRepairTabId: string | null
  showContinue: boolean
  continueEnabled: boolean
  continueTooltip: string
  terminalAccessible: boolean
}
