import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import type { Armor, InventoryItem, Weapon } from '../../types'

function isArmor(it: InventoryItem): it is Armor {
  return it.itemType === 'armor'
}

function isWeapon(it: InventoryItem): it is Weapon {
  return it.itemType === 'weapon'
}

/**
 * Equipment column — one body armor suit and two ready weapons (feeds Combat HUD A.R. + strike row).
 */
export function Armory() {
  const {
    inventoryItems,
    equippedArmorId,
    equipArmor,
    activeForm,
    readyWeaponIds,
    setReadyWeapon,
  } = useCharacter()

  const morphus = activeForm === 'morphus'
  const armors = useMemo(
    () => inventoryItems.filter(isArmor),
    [inventoryItems],
  )
  const weapons = useMemo(
    () => inventoryItems.filter(isWeapon),
    [inventoryItems],
  )

  const shell = morphus
    ? 'border-2 border-violet-500 bg-slate-950/90 text-violet-50'
    : 'border-2 border-blue-600 bg-white text-slate-900'
  const th = morphus ? 'text-violet-200' : 'text-blue-900'
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const btn = morphus
    ? 'rounded-md border-2 border-violet-300 bg-violet-800 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35'
    : 'rounded-md border-2 border-blue-600 bg-blue-600 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-35'
  const btnGhost = morphus
    ? 'rounded-md border-2 border-violet-500/80 bg-transparent px-2 py-1 text-[11px] font-bold uppercase text-violet-200 hover:bg-violet-950/80'
    : 'rounded-md border-2 border-slate-400 bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-800 hover:bg-slate-200'

  const selectCls = morphus
    ? 'mt-1 w-full rounded-md border-2 border-violet-500 bg-slate-950 px-2 py-1.5 text-xs text-violet-50'
    : 'mt-1 w-full rounded-md border-2 border-blue-400 bg-white px-2 py-1.5 text-xs text-slate-900'

  return (
    <section
      className={`rounded-xl p-4 shadow-lg ${shell}`}
      aria-labelledby="armory-heading"
    >
      <h2
        id="armory-heading"
        className={`mb-1 text-sm font-black uppercase tracking-[0.18em] ${th}`}
      >
        Equipment
      </h2>
      <p className={`mb-4 text-[11px] font-semibold leading-snug ${muted}`}>
        Wear one suit of armor (A.R. gate + armor S.D.C. on the tactical HUD). Ready up to two weapons
        for strike totals and d20 rolls there.
      </p>

      <div className="mb-5">
        <h3
          className={`mb-2 text-[11px] font-black uppercase tracking-wider ${th}`}
        >
          Body armor
        </h3>
        <ul className="space-y-2">
          {armors.map((a) => {
            const equipped = equippedArmorId === a.id
            const ruined = a.destroyed === true || a.currentSDC <= 0
            return (
              <li
                key={a.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 ${
                  morphus
                    ? equipped
                      ? 'border-amber-400/90 bg-slate-900/80'
                      : 'border-violet-700/60 bg-slate-900/40'
                    : equipped
                      ? 'border-amber-500 bg-amber-50/90'
                      : 'border-blue-200 bg-blue-50/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${th}`}>
                    {a.name}
                    {equipped ? (
                      <span className="ml-2 text-[10px] font-black uppercase text-amber-300">
                        Equipped
                      </span>
                    ) : null}
                    {ruined ? (
                      <span className="ml-2 text-[10px] font-black uppercase text-red-400">
                        Destroyed
                      </span>
                    ) : null}
                  </p>
                  <p className={`text-[11px] font-mono ${muted}`}>
                    A.R. {a.ar} · armor S.D.C. {a.currentSDC}/{a.maxSDC} · {a.weightLbs}{' '}
                    lbs
                    {a.morphusCompatible ? '' : ' · Facade-sized shell'}
                  </p>
                </div>
                <button
                  type="button"
                  className={btn}
                  disabled={ruined}
                  title={
                    ruined
                      ? 'Suit has no integrity — replace before wearing'
                      : 'Wear this armor'
                  }
                  onClick={() => equipArmor(a.id)}
                >
                  Equip
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <h3
          className={`mb-2 text-[11px] font-black uppercase tracking-wider ${th}`}
        >
          Ready weapons (max 2)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {([0, 1] as const).map((slot) => (
            <div
              key={slot}
              className={`rounded-lg border-2 px-3 py-2 ${
                morphus ? 'border-violet-700/60 bg-slate-900/40' : 'border-blue-200 bg-blue-50/50'
              }`}
            >
              <p className={`text-[10px] font-black uppercase ${th}`}>
                Ready {slot + 1}
              </p>
              <select
                className={selectCls}
                aria-label={`Ready weapon slot ${slot + 1}`}
                value={readyWeaponIds[slot] ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setReadyWeapon(slot, v === '' ? null : v)
                }}
              >
                <option value="">— None —</option>
                {weapons.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.category}, +{w.strikeBonus} strike, {w.damageDice})
                  </option>
                ))}
              </select>
              {readyWeaponIds[slot] ? (
                <button
                  type="button"
                  className={`mt-2 ${btnGhost}`}
                  onClick={() => setReadyWeapon(slot, null)}
                >
                  Clear
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
