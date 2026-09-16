import type { InventoryItem, Weapon, WeaponForgeProperties } from '../../types'
import type { GearForgeLaneId } from '../forgeNavigation/gearForge'

export type GearForgeHostKind = 'library' | 'creation' | 'sheet' | 'gm'

/** Fields accepted when forging / granting a weapon through any host. */
export type GearForgeWeaponPiece = {
  name: string
  category: string
  damage: string
  strikeBonus?: number
  weightLbs?: number
  linkedWpSkillId?: string
  wpCategory?: string
  payload?: { current: number; max: number }
  ammoCategory?: string
  catalogWeaponId?: string
  qualityVariantId?: string
  throwable?: boolean
  twoHanded?: boolean
  weaponProficiencyEligible?: boolean
  weaponSpecificModifiers?: Record<string, number>
  forgeProperties?: WeaponForgeProperties
  isArtifact?: boolean
}

export type GearForgeWeaponPatch = Partial<
  Omit<Weapon, 'id' | 'itemType'> & { forgeProperties?: WeaponForgeProperties }
>

/**
 * Host adapter — one commit pipeline for portal library, creation, sheet, and GM.
 * Stub lanes surface Radical Visibility reasons via {@link laneBlockedReason}.
 */
export type GearForgeHostAdapter = {
  kind: GearForgeHostKind
  genreId: string
  /** Character / NPC / library entry label for chrome. */
  targetLabel?: string
  /** When set, grant/create is disabled with this reason (e.g. GM with no target). */
  commitBlockedReason?: string | null
  listItems: () => readonly InventoryItem[]
  addWeapon: (piece: GearForgeWeaponPiece) => void
  updateWeapon: (id: string, patch: GearForgeWeaponPatch) => void
  dropItem: (id: string) => void
  /** Optional per-lane block beyond global MVP stubs. */
  laneBlockedReason?: (laneId: GearForgeLaneId) => string | null
}
