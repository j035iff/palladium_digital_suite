import { getWeaponProficiencyCatalogEntryById } from '../../data/library/weaponProficienciesCatalogLoader'
import type { Weapon } from '../../types'
import type { GearForgeWeaponPatch, GearForgeWeaponPiece } from './gearForgeHost'

/** Stable unique id for a newly granted inventory weapon. */
export function newInventoryWeaponId(): string {
  return `weapon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Build a carried {@link Weapon} row from a Gear Forge piece (catalog grant or custom).
 * Shared by creation / sheet / library→inventory grant paths (Unified Path).
 */
export function createInventoryWeaponFromPiece(
  piece: GearForgeWeaponPiece,
  id: string = newInventoryWeaponId(),
): Weapon {
  const wpEntry = piece.linkedWpSkillId
    ? getWeaponProficiencyCatalogEntryById(piece.linkedWpSkillId)
    : undefined
  const payload = piece.payload
    ? {
        max: Math.max(1, Math.round(piece.payload.max)),
        current: Math.max(
          0,
          Math.min(
            Math.round(piece.payload.current),
            Math.max(1, Math.round(piece.payload.max)),
          ),
        ),
      }
    : undefined

  return {
    id,
    itemType: 'weapon',
    name: piece.name.trim() || 'Unnamed weapon',
    weightLbs: Math.max(0, piece.weightLbs ?? 2),
    category: piece.category.trim() || 'Misc',
    strikeBonus: Number.isFinite(piece.strikeBonus)
      ? Math.round(piece.strikeBonus!)
      : 0,
    damage: piece.damage.trim() || '1D6',
    isEquipped: false,
    linkedWpSkillId: piece.linkedWpSkillId,
    wpCategory: piece.wpCategory ?? wpEntry?.name,
    payload,
    ammoCategory: payload ? piece.ammoCategory?.trim() || undefined : undefined,
    catalogWeaponId: piece.catalogWeaponId,
    qualityVariantId: piece.qualityVariantId,
    throwable: piece.throwable,
    twoHanded: piece.twoHanded,
    weaponProficiencyEligible: piece.weaponProficiencyEligible,
    weaponSpecificModifiers: piece.weaponSpecificModifiers,
    forgeProperties: piece.forgeProperties,
    isArtifact: piece.isArtifact,
  }
}

/** Apply a Gear Forge patch onto an existing inventory weapon (preserves id / itemType). */
export function applyInventoryWeaponPatch(
  weapon: Weapon,
  patch: GearForgeWeaponPatch,
): Weapon {
  return {
    ...weapon,
    ...patch,
    id: weapon.id,
    itemType: 'weapon',
  }
}
