import type { ForgeTabView } from './types'

/** Weapons-lane era sub-tabs (inside Weapons only — not top-level forge lanes). */
export type GearForgeWeaponsSubTabId = 'ancient' | 'modern'

export const GEAR_FORGE_WEAPONS_SUB_TAB_ORDER: readonly GearForgeWeaponsSubTabId[] =
  ['ancient', 'modern'] as const

export const GEAR_FORGE_WEAPONS_SUB_TAB_LABELS: Record<
  GearForgeWeaponsSubTabId,
  string
> = {
  ancient: 'Ancient weapons',
  modern: 'Modern weapons',
}

/** Radical Visibility — Modern stays visible with an explicit why. */
export function gearForgeWeaponsModernStubReason(): string {
  return (
    'Modern weapons catalog and forge are not wired yet. Use Ancient weapons for ' +
    'book-catalog grants, custom weapons, and forge property stacks. Modern firearms ' +
    'and ammo tooling are coming soon.'
  )
}

export function isGearForgeWeaponsSubTabId(
  id: string,
): id is GearForgeWeaponsSubTabId {
  return (GEAR_FORGE_WEAPONS_SUB_TAB_ORDER as readonly string[]).includes(id)
}

export function buildGearForgeWeaponsSubTabViews(
  activeId: GearForgeWeaponsSubTabId,
): ForgeTabView[] {
  return GEAR_FORGE_WEAPONS_SUB_TAB_ORDER.map((id) => {
    const isModern = id === 'modern'
    return {
      id,
      label: GEAR_FORGE_WEAPONS_SUB_TAB_LABELS[id],
      visual: id === activeId ? 'active' : 'available',
      clickable: true,
      blockers: isModern ? [gearForgeWeaponsModernStubReason()] : [],
      isViewing: id === activeId,
    }
  })
}
