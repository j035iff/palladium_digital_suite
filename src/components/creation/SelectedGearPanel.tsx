import { useCharacter } from '../../context/CharacterContext'
import { CreationForgePanelChrome } from './CreationForgePanelChrome'
import type { Weapon } from '../../types'

export function SelectedGearPanel({
  morphus = false,
}: {
  morphus?: boolean
}) {
  const { inventoryItems } = useCharacter()
  const weapons = inventoryItems.filter(
    (it): it is Weapon => it.itemType === 'weapon',
  )

  return (
    <CreationForgePanelChrome
      title="Starting gear"
      description="Weapons granted on the Gear tab for this draft."
      morphus={morphus}
      aria-label="Selected gear panel"
    >
      {weapons.length === 0 ? (
        <p className="text-sm opacity-60">No weapons yet — gear is optional.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {weapons.map((w) => (
            <li key={w.id} className="leading-snug">
              <span className="font-semibold">{w.name}</span>
              <span className="opacity-60"> · {w.damage}</span>
            </li>
          ))}
        </ul>
      )}
    </CreationForgePanelChrome>
  )
}
