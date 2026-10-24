/**
 * Combat Home sub-tabs — Campaigns-style chrome (Action | Abilities | Vitals).
 * Unified Path: one tab registry for Combat mode Home; do not fork per-form.
 */

export type CombatSubTabId = 'action' | 'abilities' | 'vitals'

/** Default selected Combat sub-tab (Action first). */
export const DEFAULT_COMBAT_SUB_TAB: CombatSubTabId = 'action'

export const COMBAT_SUB_TAB_ORDER: readonly CombatSubTabId[] = [
  'action',
  'abilities',
  'vitals',
] as const

export const COMBAT_SUB_TAB_LABELS: Record<CombatSubTabId, string> = {
  action: 'Action',
  abilities: 'Abilities',
  vitals: 'Vitals',
}

/** Legacy ids from earlier Combat Home labels (Physical → S/P/D → Action). */
const LEGACY_COMBAT_SUB_TAB_IDS: Record<string, CombatSubTabId> = {
  physical: 'action',
  spd: 'action',
}

export function isCombatSubTabId(id: string): id is CombatSubTabId {
  return (COMBAT_SUB_TAB_ORDER as readonly string[]).includes(id)
}

/**
 * Normalize a stored or inbound Combat sub-tab id.
 * Migrates `physical` / `spd` → `action`; unknown → default Action.
 */
export function normalizeCombatSubTabId(raw: unknown): CombatSubTabId {
  if (typeof raw !== 'string' || raw.length === 0) {
    return DEFAULT_COMBAT_SUB_TAB
  }
  if (isCombatSubTabId(raw)) return raw
  const migrated = LEGACY_COMBAT_SUB_TAB_IDS[raw]
  return migrated ?? DEFAULT_COMBAT_SUB_TAB
}
