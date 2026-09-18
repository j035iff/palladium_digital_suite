import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { buildSheetGearForgeAdapter } from '../../lib/gear/sheetGearForgeHost'
import { GearForgeShell } from '../gear/GearForgeShell'

/**
 * Live sheet Gear tab — mounts the shared {@link GearForgeShell} with a
 * `kind: 'sheet'` host adapter that commits to active character inventory.
 */
export function GearPanel() {
  const {
    character,
    hostGenreId,
    activeForm,
    supportsDualForm,
    inventoryItems,
    addWeaponToInventory,
    updateWeaponInInventory,
    dropItem,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'

  const genreId =
    hostGenreId?.trim() ||
    character.creationGenreId?.trim() ||
    character.hostGenreId?.trim() ||
    'nightbane'

  const targetLabel = character.name?.trim() || 'Active character'

  const adapter = useMemo(
    () =>
      buildSheetGearForgeAdapter({
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
        Grant catalog weapons or forge customs into this character&apos;s
        inventory. Armor / Artifacts / Other lanes stay visible with
        why-disabled reasons until wired. Ready weapons and reload live on the
        Combat HUD.
      </p>
      <GearForgeShell adapter={adapter} morphus={morphus} title="Gear" />
    </div>
  )
}
