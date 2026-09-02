import { useMemo, useState } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import {
  ammoCategoryForWeapon,
  canReloadWeapon,
  formatAmmoHudLine,
} from '../../../lib/ammoReserves'
import type { Weapon } from '../../../types'
import { WeaponReloadControl } from '../WeaponReloadControl'
import { gearPanelTheme } from './gearPanelTheme'

type Props = {
  morphus: boolean
}

export function GearWeaponsSection({ morphus }: Props) {
  const {
    inventoryItems,
    readyWeaponIds,
    setReadyWeapon,
    reloadWeapon,
    ammoReserves,
    addAmmoToReserve,
    dropItem,
  } = useCharacter()

  const theme = gearPanelTheme(morphus)
  const [ammoAddRounds, setAmmoAddRounds] = useState('12')
  const [ammoCategoryPick, setAmmoCategoryPick] = useState('9mm')

  const weapons = useMemo(
    () => inventoryItems.filter((it): it is Weapon => it.itemType === 'weapon'),
    [inventoryItems],
  )

  const activeAmmoCategories = useMemo(() => {
    const keys = new Set<string>(Object.keys(ammoReserves))
    for (const w of weapons) {
      const cat = ammoCategoryForWeapon(w)
      if (cat) keys.add(cat)
    }
    return [...keys].sort()
  }, [ammoReserves, weapons])

  const ammoReserveRows = useMemo(
    () => activeAmmoCategories.map((cat) => [cat, ammoReserves[cat] ?? 0] as const),
    [activeAmmoCategories, ammoReserves],
  )

  return (
    <div
      className={`rounded-xl p-4 shadow-lg ${theme.shell}`}
      role="tabpanel"
      aria-label="Weapons"
    >
      <p className={`mb-4 text-[11px] font-semibold leading-snug ${theme.muted}`}>
        Equip up to two weapons for the tactical HUD. W.P. skills on your sheet feed the strike
        engine when the weapon&apos;s linked W.P. skill id matches.
      </p>

      <div className={`mb-5 p-3 ${theme.ammoPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Ammo reserves
        </h3>
        <p className={`mb-3 text-[11px] leading-snug ${theme.muted}`}>
          Shared pools by caliber (e.g. 9mm). Adding rounds here refills the pool every ranged weapon
          in that category uses when you reload on the tactical HUD.
        </p>
        <ul className="mb-3 space-y-2">
          {ammoReserveRows.map(([cat, rounds]) => (
            <li
              key={cat}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 ${
                morphus ? 'border-violet-700 bg-slate-900/50' : 'border-blue-200 bg-white'
              }`}
            >
              <p className={`text-xs font-bold ${theme.th}`}>{cat}</p>
              <p className={`font-mono text-sm font-black tabular-nums ${theme.th}`}>
                {rounds} rds
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Category
            <select
              className={`mt-0.5 min-w-[8rem] ${theme.inputCls}`}
              value={ammoCategoryPick}
              onChange={(e) => setAmmoCategoryPick(e.target.value)}
            >
              {activeAmmoCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Rounds
            <input
              className={`mt-0.5 w-20 ${theme.inputCls}`}
              value={ammoAddRounds}
              onChange={(e) => setAmmoAddRounds(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className={theme.btn}
            onClick={() => addAmmoToReserve(ammoCategoryPick, Number(ammoAddRounds))}
          >
            Add rounds
          </button>
          {ammoReserveRows.map(([cat]) => (
            <button
              key={`quick-${cat}`}
              type="button"
              className={theme.btnGhost}
              onClick={() => addAmmoToReserve(cat, 12)}
            >
              +12 ({cat})
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Carried weapons
        </h3>
        {weapons.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>
            No weapons carried yet. Weapon add UI is coming — combat slots and ammo reserves are ready
            when you have entries.
          </p>
        ) : (
          <ul className="space-y-3">
            {weapons.map((w) => {
              const primary = readyWeaponIds[0] === w.id
              const secondary = readyWeaponIds[1] === w.id
              const ranged = Boolean(w.payload)
              return (
                <li key={w.id} className={`px-3 py-2 ${theme.card}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${theme.th}`}>
                        {w.name}
                        {primary ? (
                          <span className="ml-2 text-[10px] font-black uppercase text-amber-300">
                            Primary
                          </span>
                        ) : null}
                        {secondary ? (
                          <span className="ml-2 text-[10px] font-black uppercase text-cyan-300">
                            Secondary
                          </span>
                        ) : null}
                      </p>
                      <p className={`font-mono text-[11px] ${theme.muted}`}>
                        {w.category} · dmg {w.damage} · strike item {w.strikeBonus >= 0 ? '+' : ''}
                        {w.strikeBonus}
                        {w.linkedWpSkillId ? ` · W.P. link: ${w.linkedWpSkillId}` : ''}
                      </p>
                      {ranged && w.payload ? (
                        <p className={`mt-1 font-mono text-[11px] font-semibold ${theme.muted}`}>
                          Mag {w.payload.current}/{w.payload.max} · {formatAmmoHudLine(w, ammoReserves)}
                          {w.ammoCategory ? ` · ${w.ammoCategory}` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      <button type="button" className={theme.btn} onClick={() => setReadyWeapon(0, w.id)}>
                        Primary
                      </button>
                      <button type="button" className={theme.btn} onClick={() => setReadyWeapon(1, w.id)}>
                        Secondary
                      </button>
                      {(primary || secondary) && (
                        <button
                          type="button"
                          className={theme.btnGhost}
                          onClick={() => setReadyWeapon(primary ? 0 : 1, null)}
                        >
                          Unequip
                        </button>
                      )}
                      <button type="button" className={theme.btnDanger} onClick={() => dropItem(w.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  {ranged ? (
                    <div
                      className={`mt-2 border-t pt-2 ${morphus ? 'border-violet-800' : 'border-blue-200'}`}
                    >
                      <WeaponReloadControl
                        weapon={w}
                        ammoReserves={ammoReserves}
                        morphus={morphus}
                        vibrant={canReloadWeapon(w, ammoReserves)}
                        onReload={() => reloadWeapon(w.id)}
                        onReloadFailed={() => reloadWeapon(w.id)}
                      />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
