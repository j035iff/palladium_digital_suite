import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { buildCreationGearForgeAdapter } from '../../lib/gear/creationGearForgeHost'
import { GearForgeShell } from '../gear/GearForgeShell'

/**
 * Creation Tab 8 (Gear) — mounts the shared {@link GearForgeShell} with a
 * `kind: 'creation'` host adapter that commits to draft character inventory.
 */
export function CreationGearForgePanel({ morphus = false }: { morphus?: boolean }) {
  const {
    character,
    inventoryItems,
    addWeaponToInventory,
    updateWeaponInInventory,
    dropItem,
  } = useCharacter()

  const genreId =
    character.creationGenreId?.trim() ||
    character.hostGenreId?.trim() ||
    'nightbane'

  const targetLabel =
    character.name?.trim() || 'Draft character'

  const adapter = useMemo(
    () =>
      buildCreationGearForgeAdapter({
        genreId,
        targetLabel,
        listItems: () => inventoryItems,
        addWeapon: addWeaponToInventory,
        updateWeapon: updateWeaponInInventory,
        dropItem,
      }),
    [
      genreId,
      targetLabel,
      inventoryItems,
      addWeaponToInventory,
      updateWeaponInInventory,
      dropItem,
    ],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
        Optional starting gear. Grant catalog weapons or forge customs into this
        draft&apos;s inventory. Armor / Artifacts / Other lanes stay visible with
        why-disabled reasons until wired.
      </p>
      <GearForgeShell adapter={adapter} morphus={morphus} title="Gear Forge" />
    </div>
  )
}
