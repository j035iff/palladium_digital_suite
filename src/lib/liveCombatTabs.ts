/**
 * Combat Home sub-tabs — Campaigns-style chrome (Vitals | Physical | Abilities).
 * Unified Path: one tab registry for Combat mode Home; do not fork per-form.
 */

export type CombatSubTabId = 'vitals' | 'physical' | 'abilities'

export const COMBAT_SUB_TAB_ORDER: readonly CombatSubTabId[] = [
  'vitals',
  'physical',
  'abilities',
] as const

export const COMBAT_SUB_TAB_LABELS: Record<CombatSubTabId, string> = {
  vitals: 'Vitals',
  physical: 'Physical',
  abilities: 'Abilities',
}

export function isCombatSubTabId(id: string): id is CombatSubTabId {
  return (COMBAT_SUB_TAB_ORDER as readonly string[]).includes(id)
}
