import { useMemo } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import type { GearItem } from '../../../types'
import { gearPanelTheme } from './gearPanelTheme'

type Props = {
  morphus: boolean
}

export function GearOtherSection({ morphus }: Props) {
  const {
    inventoryItems,
    dropItem,
    currentWeightLbs,
    carryLimitLbs,
    strengthCapacities,
    overEncumbered,
    encumbranceSpdNote,
  } = useCharacter()

  const theme = gearPanelTheme(morphus)

  const gearItems = useMemo(
    () => inventoryItems.filter((it): it is GearItem => it.itemType === 'gear'),
    [inventoryItems],
  )

  return (
    <div
      className={`rounded-xl p-4 shadow-lg ${theme.shell}`}
      role="tabpanel"
      aria-label="Other gear"
    >
      <p className={`mb-3 text-[11px] font-semibold ${theme.muted}`}>
        General carried load — tools, supplies, and misc gear. Armor and weapons live on their own
        tabs but still count toward encumbrance.
      </p>

      {overEncumbered ? (
        <div
          className="mb-3 rounded-lg border-2 border-red-600 bg-red-950/50 px-3 py-2 text-xs font-bold text-red-100"
          role="alert"
        >
          <p className="uppercase tracking-wide">Over carry limit</p>
          <p className="mt-1 font-mono tabular-nums">
            {currentWeightLbs} lbs carried / {carryLimitLbs} lbs carry (lift{' '}
            {strengthCapacities.liftingCapacityLbs} lbs).
          </p>
          <p className="mt-1 text-[11px] font-semibold normal-case opacity-95">
            {encumbranceSpdNote}
          </p>
        </div>
      ) : (
        <p className={`mb-3 text-[11px] font-semibold ${theme.muted}`}>
          Total load{' '}
          <span className="font-mono tabular-nums">{currentWeightLbs}</span> /{' '}
          <span className="font-mono tabular-nums">{carryLimitLbs}</span> lbs carry (lift{' '}
          <span className="font-mono tabular-nums">{strengthCapacities.liftingCapacityLbs}</span>{' '}
          lbs).
        </p>
      )}

      <div>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Misc gear
        </h3>
        {gearItems.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>
            No general gear carried yet. Add tools, supplies, and other items here when the add-gear
            flow is available.
          </p>
        ) : (
          <ul className="space-y-2">
            {gearItems.map((row) => (
              <li
                key={row.id}
                className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${theme.card}`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${theme.th}`}>{row.name}</p>
                  <p className={`text-[11px] font-mono ${theme.muted}`}>{row.weightLbs} lbs</p>
                </div>
                <button type="button" className={theme.btnDanger} onClick={() => dropItem(row.id)}>
                  Drop
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
